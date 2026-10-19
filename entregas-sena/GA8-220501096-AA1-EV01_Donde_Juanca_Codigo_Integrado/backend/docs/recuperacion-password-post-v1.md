# Recuperación de contraseña post-V1

Implementada el 18 de octubre de 2026. Sustituye la funcionalidad retirada; **no** revive `POST /api/usuarios/auth/otp/solicitar`. La tabla `otp_tokens` y todas las migraciones hasta v2.45 se conservan sin cambios ni escrituras nuevas.

## Activación y SMTP

1. En una instalación existente compatible, aplicar una sola vez `database/v2.46_recuperacion_password_segura.sql` a la base aprobada. No ejecutar la baseline sobre una base existente. No se aplicó esta migración a la base habitual de la usuaria durante este bloque.
2. En una instalación nueva, el instalador ejecuta v2.45 y después v2.46 según `migraciones-v1.json`. Los checksums y huellas DDL de V1 se conservan; se añade el DDL post-V1. Resultado: 51 tablas, 94 FK, 3 triggers y 1 rutina, validado sobre MariaDB 10.4.32 temporal. MySQL 8 no está certificado.
3. Configurar únicamente fuera de Git las variables de `backend/.env.example`:

| Variable | Uso |
| --- | --- |
| `SMTP_HOST` | Host del proveedor SMTP elegido por el operador. |
| `SMTP_PORT` | Puerto del proveedor; normalmente 587 para STARTTLS o 465 para TLS directo. |
| `SMTP_SECURE` | Exactamente `true` para TLS directo o `false` para STARTTLS. |
| `SMTP_USER`, `SMTP_PASSWORD` | Credenciales autorizadas, sin valores predeterminados. |
| `MAIL_FROM` | Dirección simple, autorizada/verificada por el proveedor; sin nombre ni `< >`. |
| `RECOVERY_HMAC_SECRET` | Secreto independiente de JWT, aleatorio, mínimo 32 bytes. |

Generar el secreto localmente: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Guardarlo solo en el entorno seguro, nunca en documentación, pruebas ni Git. No se configuraron credenciales personales ni se modificó `.env`.

Nodemailer usa SMTP, exige TLS/STARTTLS con validación normal de certificados, desactiva debug/logger, archivos y URLs como contenido. No se fija proveedor. Referencia: [transporte SMTP oficial](https://nodemailer.com/smtp). Los tiempos de conexión/saludo son 10 segundos y el de socket 15 segundos.

Sin configuración completa (incluido secreto HMAC), no hay consulta de cuentas ni generación de OTP; se responde **503 para cualquier correo**. Antes de consultar usuarios se verifica conectividad/autenticación SMTP para ambos casos, evitando respuestas de disponibilidad distintas por existencia. El middleware global conserva su formato seguro para 5xx; la UI traduce 503 a «La recuperación de contraseña no está disponible actualmente. Intenta más tarde.».

## API pública y flujo

No requiere JWT ni acepta un actor, ID de usuario, rol o estado enviado por el cliente. Los cuerpos son estrictos y no admiten campos extra. Todas las respuestas llevan `Cache-Control: no-store`.

| Endpoint POST | Body | Respuesta |
| --- | --- | --- |
| `/api/usuarios/recuperacion/solicitar` | `{ "correo": "…" }` | 202, `{ "mensaje": "Si el correo está registrado, enviaremos un código de recuperación." }` |
| `/api/usuarios/recuperacion/verificar` | `{ "correo": "…", "codigo": "6 dígitos" }` | 200, `token_recuperacion` opaco y mensaje; código inválido/vencido/usado: 400 genérico. |
| `/api/usuarios/recuperacion/restablecer` | `{ "token_recuperacion": "…", "nueva_contrasena": "…", "confirmar_contrasena": "…" }` | 200 y confirmación; autorización inválida/vencida/usada: 400. |

La solicitud responde lo mismo para cuenta activa, inactiva, bloqueada o inexistente. Solo una cuenta activa recibe código. El envío se despacha en segundo plano, fuera del tiempo de respuesta del destinatario: 202 significa solicitud aceptada, **no** prueba de existencia ni garantía de entrega. Hay un máximo de 50 solicitudes/envíos en curso por proceso. No se persiste el OTP legible en una cola. Un rechazo SMTP posterior no cambia la respuesta pública y deja el código inutilizable; se registra un error interno sanitizado. La memoria de envío es efímera: reiniciar el proceso puede perder un envío pendiente; el usuario deberá solicitar otro código. No se introdujo un broker ni una cola durable.

## Modelo y seguridad

`recuperaciones_password` tiene UUID, FK `usuarios_id`, HMAC del OTP, huella de la credencial, expiración del OTP, intentos, indicadores enviado/usado/consumido, hash único de token, expiración propia del token y creación UTC. Índice por usuario/consumo/fecha y CHECK de máximo cinco intentos y coherencia del token.

- OTP: `crypto.randomInt`, seis dígitos incluidos ceros iniciales, vence a los **10 minutos**. HMAC-SHA256 por ID de recuperación y propósito; el secreto no está en la BD. Comparación con `timingSafeEqual`. No hay OTP plano en BD/API/log/auditoría.
- El código solo se habilita cuando el transporte acepta el correo. Un envío antiguo no puede reactivar una recuperación invalidada por otra solicitud.
- Cada solicitud nueva invalida todos los códigos y autorizaciones anteriores del usuario. Se bloquea primero el usuario y después la recuperación dentro de la misma conexión/transacción.
- Máximo **cinco intentos persistidos por código**. Un fallo de código se confirma transaccionalmente para no perder el contador por rollback.
- La verificación consume el OTP y genera 32 bytes aleatorios (64 caracteres hexadecimales), con propósito exclusivo de recuperación y **cinco minutos** de vigencia. En BD solo se guarda SHA-256. No es un JWT de sesión y no concede acceso al sistema.
- Restablecer consume todas las recuperaciones del usuario atómicamente con la actualización y auditoría. Las solicitudes concurrentes tienen un solo ganador.
- Una huella SHA-256 del hash de contraseña vigente invalida recuperaciones si la credencial cambió desde su emisión, también al cambiar desde Perfil. No se modifica Perfil para conseguirlo.
- Política existente: contraseña no vacía, máximo **72 bytes UTF-8**, confirmación coincidente y diferente de la actual. Se usa **bcrypt costo 12**. No se cambian rol, estado ni ID.
- Los JWT de sesión ya emitidos mantienen su expiración actual; no hay infraestructura de revocación global nueva.

## Límites

Middleware exclusivo de recuperación, en memoria por proceso, con claves SHA-256 de IP y correo normalizado (o token), sin contactos/IP legibles y capacidad máxima de 10.000 buckets:

- Solicitar: 10 por IP/15 minutos y 3 por correo/10 minutos.
- Verificar: 30 por IP/15 minutos y 5 por correo/10 minutos.
- Restablecer: 10 por IP/15 minutos y 8 por token/10 minutos.
- 429 con mensaje natural y `Retry-After`. El contador de cinco intentos del OTP permanece además en MariaDB.

Los buckets expiran y, si se llena el límite de memoria, se niega antes de crear buckets nuevos. No se confía en `X-Forwarded-For`: se conserva `trust proxy` desactivado. Detrás de un proxy los usuarios pueden compartir el límite de IP; una configuración de proxy confiable o múltiples instancias necesita revisión específica. Los límites en memoria se reinician con el proceso; no sustituyen un límite distribuido.

## Auditoría, frontend y datos sensibles

Se usa `registrarAuditoria` con el usuario identificado desde BD y transacción propia: `recuperacion_solicitada`, `otp_verificado`, `contrasena_restablecida`. `cambios_json` es `{}`: sin correo, código, token, contraseña, hash ni credenciales SMTP. El evento de solicitud confirma su creación, no entrega de correo. Las cuentas inexistentes no generan un actor falso ni un historial con IDs inventados.

Login mantiene diseño y autenticación. «¿Olvidaste tu contraseña?» abre el panel de correo → código → nueva contraseña → volver a iniciar sesión. Código, token y contraseña viven solo en memoria; no se guardan en localStorage ni URL. Hay estados de proceso/error/éxito, campos deshabilitados durante envío, validación y opción de solicitar otro código. El éxito de cambio solo se muestra después de la respuesta backend. No se modifica ninguna sesión ya iniciada al llamar a estos servicios públicos.

## Pruebas y reproducción

```powershell
node e2e/backend-regression.cjs
node --test frontend-app/tests/*.test.js
npm.cmd --prefix frontend-app run lint
npm.cmd --prefix frontend-app run build
node e2e/run.cjs
git diff --check
```

Las pruebas backend usan la bandera `RUN_MYSQL_RECUPERACION_TESTS`, activada automáticamente por el ejecutor en base desechable. El test se niega a escribir contra un nombre de BD habitual. Prueba cuentas reales/inexistentes, respuesta pública idéntica, ausencia de proveedor, rechazo SMTP, OTP protegido mediante HMAC, caducidad, cinco intentos, emisión nueva, uso único, tokens, política de contraseña, concurrencia, rollback/auditoría y login real nuevo/anterior.

La E2E usa un **doble de transporte exclusivo de pruebas**, cargado por `--require e2e/correo-test-preload.cjs` en el proceso hijo. El código productivo no conoce una bandera para simular SMTP. El preload exige `NODE_ENV=test`, BD E2E aleatoria y buzón bajo `e2e/test-results`; el buzón se elimina al terminar. Verifica UI real y API/MariaDB reales, pero no certifica la entrega externa de un proveedor SMTP.

Prueba manual opcional, fuera de la suite: aplicar la migración en un entorno aprobado, configurar SMTP real fuera de Git, reiniciar backend, abrir Login y solicitar un código para una cuenta propia activa; revisar el correo y completar el flujo. Comprobar expiración, reuso rechazado y login con nueva contraseña. No se ejecutó esa prueba ni se enviaron correos reales durante este bloque.

Limitaciones detectadas en instalación: `npm audit` reportó tres vulnerabilidades existentes en `mysql2`, `proxy-addr` y `qs` (dos moderadas y una crítica); Nodemailer no aparece entre las afectadas. No se ejecutó un `audit fix` ni se actualizaron dependencias ajenas. Es deuda pendiente separada; no se amplió confianza de proxy en este bloque.

## Resultados finales

| Validación | Resultado |
| --- | --- |
| Backend completo y SQL real aislado | 571 aprobadas, 0 fallidas, 0 omitidas. |
| Frontend completo | 446 aprobadas, 0 fallidas, 0 omitidas. |
| E2E Chromium + API/MariaDB real y correo de prueba | 9 aprobadas, 0 fallidas. |
| Lint y build frontend | Aprobados; se conserva advertencia de tamaño del bundle. |
| Instalación MariaDB 10.4.32 temporal y DDL | 51 tablas, 94 FK, 3 triggers, 1 rutina. |
| `git diff --check` | Sin errores. |

Total: **1.026 pruebas aprobadas**. La configuración Playwright ahora aísla sus artefactos en `test-results/playwright-artifacts` para no limpiar los logs/buzones de otros ejecutores de prueba.

## Archivos del bloque

```text
backend/.env.example
backend/package.json
backend/package-lock.json
backend/database/v2.46_recuperacion_password_segura.sql
backend/database/migraciones-v1.json
backend/database/CHANGELOG.md
backend/database/REGLAS_BASE_DATOS.md
backend/scripts/instalar-bd-v1.js
backend/src/index.js
backend/src/routes/recuperacionRoutes.js
backend/src/controllers/recuperacionController.js
backend/src/services/recuperacionService.js
backend/src/services/correoRecuperacionService.js
backend/src/middleware/recuperacionLimiter.js
backend/tests/recuperacion.test.js
backend/tests/roles-middleware.test.js
backend/tests/migraciones-v1.test.js
backend/docs/recuperacion-password-post-v1.md
backend/docs/recuperacion-contrasena-v1.md
frontend-app/src/components/RecuperacionPassword.jsx
frontend-app/src/services/recuperacionService.js
frontend-app/src/pages/LoginPage.jsx
frontend-app/src/pages/LoginPage.css
frontend-app/tests/recuperacion.test.js
frontend-app/tests/recuperacion-fuera-v1.test.js
e2e/run.cjs
e2e/playwright.config.cjs
e2e/correo-test-preload.cjs
e2e/specs/recuperacion.spec.cjs
```

Los archivos paralelos de Postman/evidencias/mobile y `.env` permanecen fuera del bloque.
