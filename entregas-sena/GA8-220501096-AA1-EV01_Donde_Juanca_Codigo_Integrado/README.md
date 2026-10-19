# Donde Juanca — GA8-220501096-AA1-EV01

Código fuente integrado para evidencia SENA. Preparado el 19 de octubre de 2026, America/Bogota. Se preservó la lógica funcional del original.

## Requisitos
Node.js 24 (entorno de comprobación), npm y MariaDB 10.4.32 según manifiesto, cliente SQL/Workbench compatible. MySQL 8 requiere validación y ajustes del instalador fuera del alcance de esta entrega. Puertos libres 5000 y 5173. Acceso al registro npm para instalar dependencias.

## Instalación
Extraer el ZIP. En PowerShell usar npm.cmd si npm.ps1 está bloqueado.

1. En backend ejecutar npm.cmd ci; en frontend-app ejecutar npm.cmd ci. package.json y locks originales incluidos. El package.json raíz se conserva como metadato del repositorio; sus dependencias no reemplazan las de cada módulo.
2. Copiar backend/.env.example a backend/.env. Definir DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME=dondejuanca_entrega (nombre nuevo). Completar JWT_SECRET con un valor local aleatorio: node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))". No compartir entornos reales. SMTP y RECOVERY_HMAC_SECRET solo si se habilita recuperación. PRODUCT_IMAGES_DIR es opcional; por defecto backend/uploads/productos.
3. Para instalar con el script existente: en backend, poner temporalmente DB_NAME con un nombre distinto al destino (el instalador impide instalar sobre DB_NAME habitual) y ejecutar node scripts/instalar-bd-v1.js --install dondejuanca_entrega. Solo admite MariaDB y destino vacío. Al finalizar establecer DB_NAME=dondejuanca_entrega. Requiere permiso CREATE DATABASE, tablas, rutinas y triggers. No apuntar a una base de trabajo.
4. Alternativa manual en cliente SQL: crear dondejuanca_entrega con CHARACTER SET utf8 COLLATE utf8_general_ci, seleccionarla con USE dondejuanca_entrega e importar v2.45, v2.46 y v2.47 en ese orden (backend/database). Respetar DELIMITER; no importar históricos después. Ver documentacion/BASE_DE_DATOS.md.
5. La baseline no trae usuarios. Para crear el primer administrador, en backend generar localmente un hash con node -e "require('bcrypt').hash(process.env.DEV_LOGIN_PASSWORD,12).then(console.log)" después de definir DEV_LOGIN_PASSWORD como variable del proceso, elegida localmente (no se publica una contraseña). En el cliente SQL consultar SELECT id,nombre FROM roles; e insertar en usuarios los campos id (UUID()), nombre, email, password_hash (el hash generado), estado='activo', intentos_fallidos=0 y roles_id del Administrador. No usar una contraseña en texto plano en password_hash. Retirar la variable del proceso después. El registro API de otros usuarios requiere el JWT del administrador. Este paso manual está pendiente en una instalación nueva; no se realizó sobre la base existente.
6. Copiar frontend-app/.env.example a frontend-app/.env.local; VITE_API_URL=http://localhost:5000/api. Reiniciar Vite si cambia. La plantilla .env.example raíz es solo referencia combinada: los servicios leen sus archivos locales.

## Ejecución
Terminal 1: cd backend; npm.cmd start. Terminal 2: cd frontend-app; npm.cmd run dev -- --host 127.0.0.1. Abrir http://localhost:5173 e iniciar sesión con el usuario creado. GET http://localhost:5000/ es diagnóstico básico, no certifica conexión SQL. Para producción: npm.cmd run build en frontend-app; npm.cmd run preview solo sirve para revisar la compilación.

## Comprobar integración
Importar/abrir postman/collections en una versión de Postman compatible con colecciones YAML nativas. Configurar correo, password_desarrollo, token e IDs de la base local. POST /api/usuarios/login usa correo y contrasena; usar el JWT de respuesta como Bearer para las rutas protegidas. Comprobar GET /api/productos y GET /api/mesas/estado/disponible según permisos. Si el cliente no admite YAML, convertir/exportar a Collection v2.1 desde Postman; no se atribuye ejecución a estas colecciones.

## Documentación y comprobaciones
Ver documentacion/RUTAS.md, ALCANCE.md, BASE_DE_DATOS.md y VERIFICACION.md. Los logs registran comprobaciones actuales; backend/docs y frontend-app/docs conservan detalles técnicos previos. Los tests contienen datos sintéticos y claves ficticias como fixtures, no credenciales de despliegue. Las pruebas SQL y E2E requieren entorno aislado y no se ejecutan en la base existente. npm test genérico del backend/raíz no está configurado: usar node --test tests/*.test.js en backend (SQL omitido por defecto).
