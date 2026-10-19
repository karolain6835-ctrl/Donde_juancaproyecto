# Donde Juanca - Entrega AA5 EV03

Evidencia GA7-220501096-AA5-EV03: Diseño y desarrollo de servicios web - proyecto.
Responsable: KAROL JULIO. Preparación: 19 de octubre de 2026.

## Alcance
Código real Node.js/Express, CommonJS y acceso SQL mediante mysql2. Se conserva todo src porque index.js importa otros módulos del negocio. No se modifican rutas, controladores, dependencias ni comportamiento. La documentación se centra en productos y categorías. Se incluyen package.json y package-lock.json originales.

## Requisitos e instalación
Node.js con npm (la revisión estática se ejecutó con Node 24.18.0); servidor MariaDB compatible. La baseline del proyecto indica MariaDB 10.4.32; MySQL 8 no está certificado. No se comprobó una instalación limpia en esta entrega.

Desde esta carpeta independiente:

```powershell
npm.cmd ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Completar .env con DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME de una base de evaluación. Colocar el secreto aleatorio generado en JWT_SECRET (mínimo 32 bytes). Nunca publicar .env. PORT=5000 y JWT_EXPIRES_IN_SECONDS=3600 son los valores de referencia. SMTP y RECOVERY_HMAC_SECRET son opcionales para el alcance de productos/categorías; recuperación por correo requiere configurarlos.

### Base de datos
Usar una base independiente, nunca la habitual del proyecto. Crear una base vacía con el nombre configurado y seleccionar esa base en el cliente SQL. Ejecutar una sola vez, en este orden:
1. database/v2.45_instalacion_limpia_v1.sql
2. database/v2.46_recuperacion_password_segura.sql
3. database/v2.47_productos_imagen_opcional.sql

La baseline contiene esquema, roles y configuración mínima; no contiene usuarios ni catálogo de negocio. No repetirla sobre una instalación existente. El archivo v2.21 es auxiliar del script de desarrollo: NO forma parte del plan de instalación limpia. Se omiten migraciones históricas, el instalador que exige su inventario completo y volcados de datos.

Para autenticar, el evaluador debe preparar en su base aislada un usuario activo con password_hash bcrypt y roles_id válido. Puede generar su hash localmente con bcrypt; no hay contraseña ni usuario de acceso predeterminado en esta entrega. El script npm run init:login:dev es optativo y solo inicializa usuarios de desarrollo que ya existan; no crea usuarios.

### Ejecución
```powershell
npm.cmd start
```
URL local de referencia: http://localhost:5000. El proceso requiere acceso a la base y permisos de escritura para imágenes. uploads/productos se crea al guardar una imagen; no se incluyen archivos subidos originales.

## Uso de los servicios
POST /api/usuarios/login recibe JSON con correo y contrasena de un usuario de evaluación. Si las credenciales son válidas, el controlador devuelve token. Usar Authorization: Bearer <token> en /api/productos y /api/categorias. No se incluye ningún token real.

Ejemplo de solicitud, sin afirmar que haya sido ejecutada:
```http
GET /api/productos HTTP/1.1
Host: localhost:5000
Authorization: Bearer <token_obtenido_localmente>
```

Documentación: docs/DOCUMENTACION_TECNICA.md. Inventario contrastado con el código: docs/rutas-verificadas.json. Archivos y huellas: docs/ARCHIVOS_INCLUIDOS.txt y docs/SHA256SUMS.txt. Verificaciones y diferencias: docs/VERIFICACIONES.md.

## Pruebas incluidas
npm test es el marcador original que termina en error; no equivale a una suite funcional. npm run test:login conserva su comando original. Los tests seleccionados se pueden ejecutar con node --test tests/auth-middleware.test.js tests/roles-middleware.test.js tests/login.test.js tests/productos.test.js después de instalar dependencias. Las pruebas SQL optativas requieren el proyecto completo y una base desechable; no activarlas como parte de esta entrega reducida. No se afirma que estas pruebas hayan sido ejecutadas aquí.

## PDF
La carpeta docs está destinada a recibir la documentación técnica PDF. Se entrega su contenido editable en Markdown; no se generó PDF. Exportar DOCUMENTACION_TECNICA.md a PDF antes de presentar si la plataforma exige ese formato.
