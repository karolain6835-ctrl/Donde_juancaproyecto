# Donde Juanca móvil — Fase 2

## Estado actual y ejecución

La Fase 1 fue verificada físicamente en Android mediante Expo Go por el usuario. La Fase 2 agrega autenticación real contra la API existente y un panel exclusivo para el rol exacto `Mesera`. Mesas y pedidos solo muestran «Próximamente»; no hay estadísticas ni solicitudes de esos módulos.

1. Inicia MySQL y el backend con su configuración existente (`cd backend`, `npm.cmd start`). No ejecutes inicializadores ni migraciones.
2. Ejecuta `ipconfig` en Windows e identifica la dirección IPv4 del adaptador Wi-Fi activo.
3. Copia `mobile/.env.example` a `mobile/.env.local` y reemplaza el marcador por esa IP:

```dotenv
EXPO_PUBLIC_API_URL=http://IP_LOCAL_DEL_COMPUTADOR:5000
```

La variable contiene el origen de Express, **sin `/api` final**. No contiene claves ni contraseñas y se incorpora al bundle público. `localhost` apunta al teléfono y es rechazado. La configuración se concentra en `src/services/api.ts`; una sesión guardada para otro origen no se reutiliza. Se permite HTTP solo en desarrollo para una red local de confianza; las compilaciones de producción exigen HTTPS.

4. Desde `mobile`, ejecuta `npm.cmd start -- --clear`, conecta el teléfono a la misma Wi-Fi y escanea el QR con Expo Go para SDK 57. Tras cambiar la variable, reinicia Metro. Si hay error de red, comprueba la IP, puerto y acceso de Node en el firewall para la red privada. El túnel de Metro no publica automáticamente Express.

## Autenticación y permisos de Fase 2

- El servidor usa bcrypt para contraseñas y JWT HS256 con emisor `dondejuanca`, sujeto y expiración. El móvil envía exclusivamente `{correo, contrasena}` a `POST /api/usuarios/login`.
- El contrato real devuelve `token`, `token_type: Bearer`, `expires_in` y `usuario`. Se rechazan respuestas incompletas, token malformado y vigencia inválida.
- Antes de abrir el panel, se solicita `GET /api/usuarios/me` con Bearer. Devuelve `{usuario: {id,nombre,correo,rol,estado}}` derivado de la identidad autenticada, sin recibir un ID de usuario. Debe coincidir con el usuario del login, estar activo y tener el rol exacto `Mesera`. `Mesero`, administradores y demás roles no acceden a este panel inicial.
- El middleware del backend verifica la firma y expiración y consulta el estado/rol vigentes en MySQL. Las operaciones de mesas/pedidos también tienen `autorizarRoles` en servidor; la restricción móvil no sustituye esa autorización. El servidor permite a varios roles las operaciones comunes, según sus rutas actuales.
- SecureStore guarda únicamente token, vencimiento y origen de API. No se persisten contraseñas ni perfiles. Se usa almacenamiento del dispositivo, sin AsyncStorage, con accesibilidad de Keychain al desbloquear y sin migración de dispositivo en iOS. No se exige biometría. [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) está incluido en Expo Go; se instaló `~57.0.4`, no la versión latest.
- La identidad se verifica al restaurar la sesión y al volver a primer plano. Mientras se valida no se muestra el panel. Fallos de conexión, identidad, 401/403 o sesión vencida cierran el acceso y requieren login. Un temporizador maneja el vencimiento durante el uso; no existe renovación de token en la API inspeccionada.
- `Stack.Protected` protege las rutas e impide regresar al panel después del logout. Cerrar sesión borra estado y SecureStore. Si falla el borrado, se informa y se ofrece reintentar; la API existente no revoca tokens, por lo que un token previamente copiado sigue válido hasta expirar. No se inventó un endpoint de logout.
- Las solicitudes tienen timeout de 15 segundos, manejo de errores HTTP/JSON/red y bloqueo de envío duplicado. No hay registros de contraseñas, tokens o cuerpos. La contraseña se limpia después de cada intento.

No se requieren cambios de backend para esta fase. La API actual no ofrece revocación de JWT ni renovación; son limitaciones documentadas. No se alteraron backend, MySQL ni frontend web; no se crearon usuarios ni se hicieron commits/push.

## Archivos de Fase 2

Nuevos: `.env.example`, `src/services/api.ts`, `src/services/auth.ts`, `src/services/sessionStore.ts`, `src/context/AuthContext.tsx`, `src/app/panel.tsx`, `tests/auth.test.cjs`.

Modificados: `.gitignore`, `src/app/_layout.tsx`, `src/app/acceso.tsx`, `src/components/ActionButton.tsx`, `src/components/Screen.tsx`, `package.json`, `package-lock.json`, `app.json` y este README. Se mantienen `index.js`, `App.js`, SDK 57, el logo y la bienvenida.

## Pruebas de Fase 2

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npx.cmd expo install --check
npx.cmd expo-doctor
npx.cmd expo export --platform android --output-dir dist
```

Las pruebas automatizadas aíslan transporte y almacenamiento; cubren contrato de login/Bearer, identidad actual, rechazo de roles y usuarios inactivos, respuestas incompletas, vigencia inválida, identidad diferente, errores HTTP/red/JSON, URL insegura o incorrecta y escritura/lectura/borrado de sesión. Usan fixtures sintéticos solo dentro de los tests, nunca credenciales de la aplicación ni MySQL.

Resultados ejecutados: 6/6 pruebas automatizadas aprobadas, TypeScript y ESLint sin errores, `expo install --check` con dependencias compatibles y Expo Doctor 21/21. Exportación Android con Hermes completada (1239 módulos). La navegación protegida fue revisada en código y sus importaciones compiladas; no se probó interacción física de Fase 2.

Pendiente en Expo Go con una cuenta existente (sin crear usuarios):

- Campos vacíos, correo inválido, contraseña incorrecta, mostrar/ocultar y pulsaciones rápidas.
- Login válido de una Mesera activa: observar nombre real y tarjetas de próximos módulos.
- Cuenta de otro rol: acceso rechazado y sin panel.
- Cerrar/reabrir la aplicación: validar sesión guardada contra `/me`.
- Volver desde segundo plano con sesión vencida, usuario desactivado o rol cambiado por los medios administrativos existentes; comprobar pérdida de acceso.
- Cerrar sesión, pulsar Atrás e intentar abrir `/panel`: no debe aparecer el panel.
- API apagada, dirección incorrecta y pérdida de Wi-Fi: error comprensible, sin éxito simulado.
- Teclado, desplazamiento, texto aumentado y SecureStore en el dispositivo real.

No se comprobó una respuesta de autenticación válida contra el servidor real en esta implementación: no se recibieron credenciales y no se usaron usuarios existentes. No hay capturas ni resultados físicos inventados. npm sigue reportando 28 vulnerabilidades (10 moderadas, 18 altas); no se ejecutó `npm audit fix --force`.

## Registro histórico de Fase 1

El contenido siguiente registra el alcance y verificaciones de la primera entrega; las instrucciones de Fase 2 anteriores describen el estado actual.

Aplicación para el equipo de atención. Solo se implementó la bienvenida y la navegación hacia una pantalla informativa de acceso. No hay autenticación simulada, llamadas a la API ni operaciones sobre MySQL.

## Ejecutar en Android

Desde la raíz del repositorio:

```powershell
cd mobile
npm.cmd start -- --clear
```

Conecta el computador y el celular a la misma red Wi-Fi. Abre Expo Go compatible con SDK 57 y escanea el QR de la terminal. Comprueba la bienvenida, pulsa «Ir al inicio de sesión», vuelve con el botón de la pantalla y prueba también el botón Atrás de Android. Revisa legibilidad con tamaño de texto aumentado y desplazamiento en una pantalla pequeña.

Esta fase funciona sin iniciar el backend. La prueba física y la revisión visual en Android están pendientes; no se generaron capturas como evidencia.

## Estructura y archivos

- `App.js`: adapta el componente raíz a Expo Router; `index.js` conserva su registro original y sigue siendo la entrada.
- `src/app/_layout.tsx`: navegación Stack y barra de estado.
- `src/app/index.tsx`: bienvenida.
- `src/app/acceso.tsx`: destino informativo; el formulario corresponde a Fase 2.
- `src/components/Screen.tsx`: área segura, contenido desplazable y ancho adaptable.
- `src/components/ActionButton.tsx`: botón reutilizable con accesibilidad.
- `src/theme/index.ts`: paleta centralizada.
- `src/assets/brand/logo.png`: copia del logo existente `frontend-app/src/assets/brand/logos/oscuro.png`, colocado sobre blanco para conservar su legibilidad.
- `src/types/metro.d.ts`, `tsconfig.json`, `eslint.config.js`: tipos y análisis estático.
- `package.json`, `package-lock.json`: dependencias compatibles y comandos de verificación.
- `app.json`: plugins de navegación, status bar y fuentes; esquema `dondejuanca`. Se conservaron slug, iconos, orientación y ajustes existentes.

El sitio web usa verde/naranja y fuentes propias. Se reutilizó su logo y se aplicó la paleta carbón/lavanda solicitada para móvil, sin modificar los recursos web.

## Inspección del sistema existente

Revisión estática del código, sin ejecutar consultas ni solicitudes contra la base de datos:

- `backend/src/index.js`: Express, `cors()`, JSON y middleware de errores. Monta las APIs existentes; puerto predeterminado 5000.
- `backend/src/config/db.js`: conexión `mysql2` con variables `DB_*` del entorno del servidor. No se trasladaron secretos a móvil.
- `backend/src/routes`, `controllers`, `services`: rutas y controladores con SQL y servicios para transacciones, identidad, inventario y sesiones. No se encontró una capa separada de modelos.
- `POST /api/usuarios/login`: recibe `correo`, `contrasena`; verifica bcrypt y estado activo. Devuelve `mensaje`, `token`, `token_type`, `expires_in`, `usuario` con `id`, `nombre`, `correo`, `roles_id`, `rol`. Puede actualizar `ultimo_acceso`; no se invocó.
- Autenticación: JWT Bearer HS256, emisor `dondejuanca`, expiración y resolución del usuario/rol actual en MySQL. Permisos por ruta con `autorizarRoles`; existen los valores exactos `Mesera` y `Mesero`. Listar usuarios completos requiere administrador; existe un catálogo mínimo `/api/usuarios/responsables`.
- Mesas: no existe `GET /api/mesas`. Se usa `GET /api/mesas/estado/:estado` con `disponible`, `ocupada`, `en_cobro`; devuelve `mensaje`, `total`, `datos` (filas de mesas). Los identificadores se deben preservar como valores del servidor.
- `GET /api/productos`: `mensaje`, `total`, `datos`, con columnas de productos y `categoria_nombre`. `GET /api/productos/:id` devuelve el objeto en `datos`.
- `GET /api/categorias`: `mensaje`, `total`, `datos` con filas de categorías.
- `GET /api/pedidos`: filtros `pagina`, `limite` (máximo 100), `estado` (`abierto`, `cerrado`, `cancelado`) y `mesas_id`; devuelve `datos` y `paginacion`.
- `GET /api/pedidos/:id`: `mensaje`, `datos` con pedido e `items`; estos contienen nombre, cantidad pedida, precio unitario, estado e identificadores de producto, participante y ronda.
- `POST /api/pedidos` abre una cuenta, no recibe un carrito. Lee `mesas_id`, `usuarios_id`, `clientes_id` y la selección de participante mediante `participante_id` o `participante_temporal.nombre`. Requiere cliente o participante; para meseras el responsable debe ser su propio usuario. Devuelve 201 con `mensaje`, `id_pedido`. Productos se agregan mediante las rutas de ítems/rondas. Su integración queda pendiente.
- Hay validaciones en controladores y servicios, respuestas de error y autorización del servidor. Esta inspección no certifica el funcionamiento del servidor desplegado.

En una fase posterior la URL de Express deberá centralizarse y usar la IP LAN del computador para el teléfono. No se agregó una URL sin uso ni se configuró acceso directo a MySQL.

## Verificación y evidencia SENA

Herramientas: Node.js 24.18.0, npm, Expo CLI, React Native, Expo Router, TypeScript y ESLint. Se conserva Expo `~57.0.30`, React `19.2.3`, React Native `0.86.3`. Referencias: [SDK 57](https://docs.expo.dev/versions/v57.0.0/) y [instalación de Router](https://docs.expo.dev/router/installation/).

Resultados finales: lint y TypeScript sin errores; `expo install --check` indicó dependencias actualizadas; Expo Doctor aprobó 21/21 comprobaciones; exportación Android completada.

Comandos reproducibles:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npx.cmd expo install --check
npx.cmd expo-doctor
npx.cmd expo export --platform android --output-dir dist
```

Metro inició en modo offline en el puerto 8083. La exportación Android con Hermes compiló 1232 módulos y generó el bundle en `dist` (ignorado por Git). Esto comprueba compilación, no ejecución física ni interacción en Expo Go.

Se corrigieron versiones transitivas de React DOM, Worklets y expo-font usando `expo install`. npm reporta 28 vulnerabilidades (10 moderadas, 18 altas); no se ejecutó `audit fix --force`. Queda pendiente una revisión específica de esas dependencias. No se modificaron backend, base de datos, frontend web ni archivos Postman. No se hicieron commits ni push.

Para GA8-220501096-AA2-EV01, completar posteriormente la evidencia con capturas reales de Expo Go y resultados observados de bienvenida, ida/vuelta, botón Atrás y accesibilidad. Las fases 2 a 5 requieren autorización posterior.

## Ajustes de configuración y legibilidad — 19 de octubre de 2026

- `.env.local` ya existía con `EXPO_PUBLIC_API_URL=http://192.168.2.232:5000`, sin `/api`, sin BOM ni secretos. Se conservó. `git check-ignore -v mobile/.env.local` confirma la regla `.env*.local` de `mobile/.gitignore`; no fue necesario modificarla.
- `src/services/api.ts`: se conserva el acceso directo `process.env.EXPO_PUBLIC_API_URL` requerido por Expo y se documenta por qué no usar acceso dinámico. No se encontró un error de importación o lectura. El aviso del celular podría proceder de un bundle anterior; no se puede confirmar retrospectivamente.
- `src/theme/index.ts`: familias explícitas `body` (sans-serif en Android) y `display` (cursive en Android). No había archivos de una fuente decorativa ni carga de fuentes personalizadas en este proyecto; se usa cursiva nativa para marca y títulos principales. Su aspecto exacto depende de la plataforma y debe revisarse en el teléfono. El logo se conserva.
- `src/app/index.tsx`, `src/app/acceso.tsx`, `src/app/panel.tsx` y `src/components/ActionButton.tsx`: aplicación de esas familias. Campos, etiquetas, botones, errores, información y tarjetas del panel usan sans serif. Se conservan colores, distribución, rutas y lógica de autenticación. Los futuros datos operativos deben usar `typography.body`.
- `tests/auth.test.cjs`: regresión para URL LAN válida y POST al endpoint sin duplicar `/api`, con transporte simulado y sin credenciales reales.

Verificaciones de esta revisión: TypeScript y ESLint sin errores; 7/7 pruebas; `expo install --check` con dependencias compatibles; Expo Doctor 21/21. Se mantiene Expo ~57.0.30. Exportación Android de desarrollo con Metro y caché limpia completada (1371 módulos); se inspeccionó el JavaScript generado y contiene la URL LAN correcta. El servicio con esa URL no arroja el aviso de configuración. La navegación existente se revisó estáticamente y compiló; su interacción física sigue pendiente. No se llamó al backend ni a MySQL.

Metro se inició con `npm.cmd start -- --clear --port 8081` y confirmó la carga de `.env.local`. Para reiniciar manualmente, detén Metro con Ctrl+C en su terminal y, desde `mobile`, ejecuta:

```powershell
npm.cmd start -- --clear --port 8081
```

Con el backend existente en ejecución y ambos dispositivos en la misma Wi-Fi, vuelve a abrir el proyecto en Expo Go desde el QR; también puedes introducir `exp://192.168.2.232:8081`. Haz una recarga completa para descartar un mensaje anterior. Comprueba bienvenida → acceso → volver, campos y errores legibles, mostrar/ocultar contraseña y texto aumentado. Inicia sesión con una cuenta Mesera activa existente: debe llamar a `POST http://192.168.2.232:5000/api/usuarios/login` con `{correo, contrasena}`, verificar `/api/usuarios/me` y mostrar el panel con su nombre. Después cierra sesión y pulsa Atrás: el panel debe seguir protegido. Prueba también contraseña incorrecta y desconexión de red. Si falla la red, revisa la IP y el permiso de Node en el firewall de red privada.

No se ha comprobado login real, conectividad desde el celular ni aspecto visual físico. No se modificaron backend, web, MySQL o contratos; no se implementó Fase 3 ni se hicieron commits/push.

Referencias: [variables de entorno de Expo](https://docs.expo.dev/guides/environment-variables/), [SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo Font SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/font/).

## APK de pruebas — GA8-220501096-AA2-EV02

Esta sección reemplaza las limitaciones históricas de configuración anteriores. Identidad: **Donde Juanca**, paquete `com.dondejuanca.meseras`, versión `1.0.0`, versionCode `1`, esquema `dondejuanca`. Se mantiene SDK 57. No se ha ejecutado EAS Build ni iniciado sesión o generado firma. El usuario confirmó login físico de Lina en Expo Go; el APK aún requiere pruebas propias.

### Perfiles y conexión

- `preview`: APK autónomo de distribución interna, entorno EAS `preview`. Requiere `EXPO_PUBLIC_API_URL` HTTPS con certificado válido. Es la opción preferida cuando exista un backend público o proxy HTTPS autorizado. No se ha publicado ni cambiado el backend.
- `preview-local`: hereda APK interno y fija `http://192.168.2.232:5000`. Está listo para las pruebas en la misma LAN mientras no exista HTTPS. No es un perfil de producción.
- No hay perfil de producción todavía. Cualquier perfil distinto de `preview-local` exige HTTPS al evaluar la configuración. No heredar `preview-local` en futuros perfiles de producción.

`app.config.js` deriva `EXPO_PUBLIC_LOCAL_API_ALLOWED` exclusivamente de `EAS_BUILD_PROFILE`; ignora un valor público externo de esa bandera. El servicio conserva las validaciones de URL y solo agrega la excepción para el origen exacto autorizado en el perfil local. Expo Go sigue admitiendo HTTP de desarrollo y conserva `.env.local`, sin modificarlo. Para volver a Expo Go, abre una terminal sin `EAS_BUILD_PROFILE` y ejecuta `npm.cmd start -- --clear`.

El plugin `plugins/withNetworkSecurity.js` genera la política nativa: bloqueo general de tráfico claro, confianza en certificados del sistema y, únicamente en `preview-local`, excepción para `192.168.2.232`, sin subdominios. Android limita por host, no por puerto: la restricción al puerto 5000 se aplica adicionalmente en el servicio JS. No se desactiva TLS ni se aceptan certificados inválidos. Una futura compilación HTTPS genera el XML sin excepción. Los archivos se generan mediante config plugin, sin mantener carpetas nativas manuales.

HTTP transmite correo, contraseña y Bearer sin cifrar en la red. Usar solo una red privada controlada, no distribuir ese APK como producción y preferir `preview` con HTTPS cuando esté disponible. El computador debe estar encendido, Express accesible en LAN, puerto 5000 permitido en firewall privado y celular en la misma red sin aislamiento. El APK contiene la interfaz, no Express ni MySQL; EAS tampoco publica el backend. Cambiar una variable incorporada al bundle requiere reconstrucción. No hay secretos en variables públicas: DB_*, JWT_SECRET, contraseñas y tokens permanecen fuera de la configuración móvil.

### Recursos y permisos

Nuevos `assets/android/icon.png`, `adaptive-foreground.png`, `splash.png`: adaptaciones mecánicas del logo existente con márgenes, sin rediseño. `scripts/prepare-brand.cjs` permite reproducirlos usando las utilidades de imagen de Expo. Se conserva intacto `src/assets/brand/logo.png` y todos los iconos originales de plantilla. Splash carbón, icono sobre blanco para contraste y logo sin recortes intencionales. Se agregó `expo-splash-screen` compatible con SDK 57. Su presentación nativa debe verificarse en el APK; Expo Go no reproduce completamente el splash de distribución.

Se solicita explícitamente `INTERNET`. Se bloquean `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` y `VIBRATE`, incluidos permisos no necesarios de la plantilla. SecureStore permanece instalado y sus reglas excluyen las sesiones de las copias de seguridad Android. No se cambian roles, contrato o lógica de autenticación. El manifiesto fusionado definitivo y cualquier permiso aportado por librerías deben revisarse en el APK antes de distribuirlo.

### Archivo de subida y comandos posteriores

**Ejecutar siempre desde `mobile` con raíz aislada**: EAS puede tomar por defecto la raíz Git del repositorio padre. Con estas variables la raíz de subida es exclusivamente `mobile` y se usa su `.easignore`. No hace falta commit. La lista permitida incluye entrada, configuración, lockfile, TypeScript, fuentes, plugins y recursos; excluye node_modules, .expo, dist, pruebas, scripts auxiliares, todos los .env, keystores y credenciales. No añadir secretos dentro del código o los recursos permitidos.

Comandos para ejecutar **solo después de autorizar login, vinculación y firma**:

```powershell
cd mobile
$env:EAS_NO_VCS = '1'
$env:EAS_PROJECT_ROOT = (Get-Location).Path
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
```

`eas init` vinculará el proyecto y agregará su projectId a la configuración; no inventar ese identificador ni sobrescribir `eas.json`. Si solicita un slug distinto, aprobarlo antes de continuar. No se ha ejecutado ninguno de esos pasos.

Para HTTPS: definir en el panel EAS la variable pública `EXPO_PUBLIC_API_URL` del entorno `preview` con el origen real, sin `/api`. No usar un dominio de ejemplo. Después:

```powershell
npx.cmd eas-cli@latest build:inspect --platform android --stage archive --output .verification/archive-https --profile preview
npx.cmd eas-cli@latest build --platform android --profile preview --clear-cache
```

Mientras se use la IP local, el perfil ya contiene su URL:

```powershell
npx.cmd eas-cli@latest build:inspect --platform android --stage archive --output .verification/archive-local --profile preview-local
npx.cmd eas-cli@latest build --platform android --profile preview-local --clear-cache
```

`build:inspect --stage archive` prepara una copia local para revisar exactamente lo que se subiría, sin compilar. Se deja pendiente hasta la vinculación EAS. Revisar que no haya archivos externos ni secretos antes de ejecutar `build`. La primera compilación puede solicitar generar una clave de firma: esa operación requiere autorización del usuario. Preferir firma administrada por EAS y reutilizarla en las siguientes versiones; no guardar keystores o contraseñas en Git. No usar `eas submit` para esta evidencia.

### Verificaciones y pendientes

TypeScript y ESLint pasan; 11/11 pruebas, incluyendo aislamiento de perfiles, validación HTTP/HTTPS en modo release, política XML/manifiesto y exclusiones de subida. Dependencias compatibles y Expo Doctor 21/21. Se evaluó configuración Android mediante introspección y se exportó el bundle Android en modo producción de `preview-local` (1239 módulos), comprobando que la excepción y la URL se incorporan al JS. Esto no genera un APK ni certifica conexión física.

Pendientes: vinculación de la cuenta/proyecto EAS, revisión del archivo real de subida, autorización de firma y compilación. Para `preview` falta el origen HTTPS real. Después de compilar: instalar APK, revisar nombre/icono/splash, login Mesera, rechazo de otros roles, restauración de sesión y logout, navegación Atrás, manejo de red caída y conectividad LAN/HTTPS. El APK puede abrir sin Metro, pero el login exige backend accesible. No se modificaron backend, web o MySQL ni se hicieron commits/push.

La instalación informó 29 avisos de vulnerabilidad de dependencias (11 moderados, 18 altos); compatibilidad SDK no equivale a ausencia de vulnerabilidades. No se ejecutaron arreglos automáticos ni forzados.

Referencias: [APK en EAS](https://docs.expo.dev/build-reference/apk/), [archivo de subida](https://github.com/expo/fyi/blob/main/eas-build-archive.md), [seguridad de red Android](https://developer.android.com/privacy-and-security/security-config), [Splash SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/).

Verificaci?n adicional: se export? tambi?n preview con un origen HTTPS sint?tico, sin conexiones de red al endpoint. Se ejecut? el m?dulo API del bundle y se comprob? que rechaza HTTP incluso sustituyendo la URL. Al alternar perfiles es necesario limpiar la cach?: sin limpieza Metro puede reutilizar transformaciones anteriores. Los comandos EAS anteriores incluyen --clear-cache. El manifiesto introspectado final solo declara INTERNET como permiso activo; falta verificar el manifiesto fusionado del APK.


### Segunda inspecci?n real del archivo EAS (19 de octubre de 2026)

Se corrigi? `.easignore`: se eliminaron las inclusiones con negaciones que omit?an carpetas y se usan exclusiones expl?citas tanto de directorios como de sus descendientes (`.verification` y `.verification/**`, etc.). `/android` y `android/**` excluyen ?nicamente el proyecto nativo ra?z, conservando `assets/android`. Se mantienen los archivos necesarios y se excluyen entornos privados, firma, certificados, credenciales, cach?s, dependencias instaladas, resultados previos, pruebas y scripts auxiliares.

Se ejecut? realmente EAS `build:inspect --stage archive --profile preview-local` con EAS_NO_VCS=1 y EAS_PROJECT_ROOT=mobile. Resultado final en `.verification/archive-local-v2`: **35 archivos**, con `src` completo (13), `assets` completo (9) y `plugins` completo (1). Los 12 archivos ra?z incluyen entradas, configuraciones Expo/EAS/TypeScript/ESLint, manifest y lockfile npm, exclusiones y licencia. Todos los archivos requeridos se compararon mediante SHA-256 con el proyecto original: sin faltantes ni diferencias.

No se encontraron `.verification`, `.expo`, dist, node_modules, backend, frontend web, dumps SQL, bases locales, archivos de firma ni entornos privados. La revisi?n de texto no encontr? patrones de tokens/clave privada ni coincidencias con valores privados comprobados; no se imprimieron secretos. Se conserva Expo 57.0.30, perfil APK interno preview-local, plugin HTTP y vinculaci?n owner karituss / projectId 3ec30f08-ac89-4f24-b89a-470d3dd0175e. La identidad remota no se volvi? a consultar: se verific? que la referencia archivada coincide con la existente.

Verificaciones: TypeScript y ESLint sin errores; **12/12 pruebas**, incluida validaci?n del archivo real de EAS; dependencias compatibles y Expo Doctor 21/21. El script `node scripts/verify-eas-archive.cjs` permite repetir la comprobaci?n sobre v2 y falla ante faltantes, diferencias o informaci?n privada detectada. Las inspecciones incompletas anteriores son descartes, no deben usarse para compilar y permanecen excluidas junto con toda `.verification`.

**Preparaci?n local completa para autorizar la compilaci?n de pruebas**. No se ejecut? EAS Build ni se generaron credenciales, commits o push. La firma y el APK f?sico siguen pendientes. El HTTP local requiere la misma red privada y backend accesible; este chequeo no sustituye pruebas f?sicas del APK.
