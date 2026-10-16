# Servicio web de autenticación — Donde Juanca

**SENA — Evidencia GA7-220501096-AA5-EV01**

**Diseño y desarrollo de servicios web - caso**

**Aprendiz:** Karol Lineth Julio Uran

**Proyecto:** Donde Juanca

**Fecha de preparación:** 16 de octubre de 2026

**Repositorio:** https://github.com/karolain6835-ctrl/Donde_juancaproyecto

## Introducción

Esta entrega presenta el servicio de autenticación ya implementado en Donde Juanca. El sistema permite gestionar las operaciones del establecimiento y utiliza una API para comunicar la interfaz con la base de datos. Se reutiliza el login existente, previamente probado en Postman según lo informado por la aprendiz. No se desarrolla nuevamente ni se ejecutan nuevas pruebas funcionales para preparar esta evidencia.

## Objetivo general

Documentar y presentar el servicio REST de autenticación existente para su entrega académica, mostrando su organización, contrato HTTP, validaciones y dependencias, sin modificar la lógica del proyecto original.

## Tecnologías utilizadas

| Tecnología | Responsabilidad |
|---|---|
| Node.js y JavaScript CommonJS | Ejecutar el servicio en el servidor |
| Express 5 | Recibir peticiones HTTP y procesar JSON |
| MySQL y mysql2 | Consultar usuarios y roles; actualizar el último acceso |
| bcrypt 6 | Comparar la contraseña recibida con el hash almacenado |
| jsonwebtoken 9 | Firmar tokens JWT mediante HS256 |
| dotenv 17 | Cargar configuración local desde variables de entorno |
| Postman | Herramienta utilizada en las pruebas previas del servicio |

Las versiones declaradas y resueltas se conservan en `package.json` y `package-lock.json`, procedentes del backend original. `node:crypto` es un módulo incorporado de Node.js que utiliza el controlador para otras funciones no expuestas en esta entrega.

## Qué es un servicio web REST

Un servicio web REST ofrece una interfaz HTTP para que aplicaciones intercambien representaciones de datos, habitualmente JSON. Los métodos HTTP expresan la operación solicitada y los códigos de estado informan su resultado. Este endpoint recibe credenciales con POST y devuelve una representación JSON del resultado de autenticación. El token emitido puede enviarse como `Authorization: Bearer <token>` a los servicios protegidos del proyecto completo. Esta entrega expone únicamente el login.

## Arquitectura y organización

Esta documentación referencia el backend original para evitar duplicar código y dependencias.

```text
backend/
  src/index.js                         Montaje /api/usuarios y procesamiento JSON
  src/routes/usuariosRoutes.js         Declaración POST /login
  src/controllers/usuariosController.js Autenticación existente
  src/config/db.js                     Conexión MySQL
  package.json                        Dependencias y script start
  package-lock.json                   Versiones resueltas
  .env.example                        Plantilla de configuración local
  database/                           Esquema y migraciones existentes
docs/entregas-sena/GA7-220501096-AA5-EV01/
  README.md
  PRUEBAS_POSTMAN.md
  REPOSITORIO_GITHUB.txt
```

Flujo: cliente HTTP → Express → usuariosRoutes → loginUsuario → MySQL/bcrypt → JWT → respuesta JSON. El login no exige autenticación previa; las demás rutas del módulo conservan sus middlewares existentes. El arranque del backend monta todos sus módulos, sin cambios funcionales para esta evidencia.

## Contrato del endpoint

| Propiedad | Valor |
|---|---|
| Método | `POST` |
| URL local predeterminada | `http://localhost:5000/api/usuarios/login` |
| Content-Type | `application/json` |
| Autenticación previa | No requiere token |
| Parámetros de ruta o consulta | Ninguno utilizado por el controlador |
| Cuerpo | Objeto JSON con `correo` y `contrasena` |

| Campo | Tipo | Tratamiento real |
|---|---|---|
| `correo` | string | Obligatorio; no puede estar vacío tras `trim()`; se consulta recortado |
| `contrasena` | string | Obligatoria; no vacía; máximo 72 bytes UTF-8; se compara sin recortarla |

El login no aplica una expresión regular de formato de correo ni exige una longitud mínima de contraseña. Estas reglas no deben confundirse con las del registro de usuarios. Los campos adicionales del JSON no son utilizados.

## Validaciones y flujo implementado

1. Comprueba los tipos y campos obligatorios del cuerpo, y el límite de contraseña de bcrypt.
2. Comprueba que `JWT_SECRET` tenga al menos 32 bytes y que la vigencia sea un entero seguro positivo. La vigencia predeterminada es 3600 segundos.
3. Consulta por correo usando un parámetro SQL, con JOIN entre `usuarios` y `roles`.
4. Verifica que exista un hash bcrypt con el formato aceptado por el controlador (`$2a$` o `$2b$`) y compara la contraseña mediante `bcrypt.compare`. Los marcadores de desarrollo no autentican.
5. Si las credenciales coinciden, exige que el estado del usuario sea exactamente `activo`.
6. Firma el JWT con HS256, emisor `dondejuanca`, sujeto igual al ID del usuario y campos `roles_id` y `rol`.
7. Actualiza `ultimo_acceso` únicamente si el estado, hash y rol siguen coincidiendo. Si la actualización no afecta exactamente una fila, rechaza la autenticación por un posible cambio concurrente.
8. Devuelve el token y los datos públicos del usuario, sin incluir `password_hash`.

## Ejemplos JSON

Los siguientes ejemplos reproducen las estructuras y mensajes del controlador. Los datos de usuario y la contraseña son marcadores ilustrativos, no credenciales utilizables. El token es un marcador, no un JWT real. No son capturas de las pruebas previas.

Solicitud:

```json
{
  "correo": "aprendiz@example.invalid",
  "contrasena": "<CONTRASEÑA_LOCAL_DEL_USUARIO>"
}
```

Respuesta HTTP 200, con la vigencia predeterminada:

```json
{
  "mensaje": "¡Inicio de sesión exitoso! Bienvenido al sistema de Donde Juanca. 🔓✨",
  "token": "<JWT_GENERADO_POR_EL_SERVIDOR>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "usuario": {
    "id": "<ID_DEL_USUARIO>",
    "nombre": "<NOMBRE_DEL_USUARIO>",
    "correo": "aprendiz@example.invalid",
    "roles_id": 1,
    "rol": "Administrador"
  }
}
```

El ID, nombre, correo, ID del rol y nombre del rol se obtienen de MySQL. `expires_in` refleja la configuración del entorno.

Respuesta HTTP 400:

```json
{ "error": "El correo y la contraseña son obligatorios." }
```

Respuesta HTTP 401 por credenciales incorrectas:

```json
{ "error": "Credenciales incorrectas." }
```

Respuesta HTTP 403 después de validar las credenciales de un usuario no activo:

```json
{ "error": "El usuario no está activo." }
```

Respuesta HTTP 401 por cambio concurrente:

```json
{ "error": "Las credenciales o el estado cambiaron. Intenta nuevamente." }
```

Respuesta HTTP 500 por configuración JWT inválida:

```json
{ "error": "El inicio de sesión no está configurado correctamente." }
```

Respuesta HTTP 500 ante un error interno capturado:

```json
{ "error": "Error interno al iniciar sesión." }
```

## Códigos de estado HTTP

| Código | Condición del controlador |
|---|---|
| 200 | Autenticación y actualización de último acceso exitosas |
| 400 | Cuerpo sin campos válidos o contraseña superior a 72 bytes |
| 401 | Usuario inexistente, hash no admitido, contraseña incorrecta o cambio concurrente |
| 403 | Credenciales válidas y usuario no activo |
| 500 | Configuración JWT inválida o error interno, por ejemplo de MySQL |

JSON malformado es rechazado por `express.json()` antes de entrar al controlador. Una ruta inexistente recibe 404 de Express. Esas respuestas no tienen necesariamente el contrato JSON del login. No se agrega un manejador alternativo ni se atribuye su salida al controlador original.

## Instalación y ejecución del backend existente

Se requiere Node.js 20 o superior, npm y MySQL 8 con el esquema y las migraciones del proyecto aplicados. Debe existir una cuenta activa en usuarios, relacionada con roles, con un hash bcrypt válido. Esta evidencia no crea cuentas ni distribuye credenciales.

Desde la raíz del repositorio:

```bash
npm install
cd backend
npm install
```

La instalación en la raíz proporciona las dependencias del proyecto, incluida cors, utilizada por la entrada actual del backend. La instalación en backend proporciona sus dependencias declaradas. Si PowerShell bloquea npm.ps1, utiliza npm.cmd.

Dentro de backend, copia .env.example como .env y completa localmente DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME para la base existente. Configura JWT_SECRET con un secreto propio de al menos 32 bytes y JWT_EXPIRES_IN_SECONDS con un entero positivo (3600 por defecto). No publiques .env. Puedes generar el secreto localmente con:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Con el directorio de trabajo en backend:

```bash
npm start
```

El puerto predeterminado es 5000; PORT permite cambiarlo. La URL del login es http://localhost:5000/api/usuarios/login. La cuenta y la base utilizadas en las pruebas previas pueden reutilizarse en el entorno local autorizado. Un acceso exitoso actualiza ultimo_acceso. Esta preparación documental no inicia el servidor ni ejecuta operaciones contra MySQL.

## Pruebas previas y verificación documental

La aprendiz confirmó pruebas exitosas previas en Postman. Consulta [PRUEBAS_POSTMAN.md](PRUEBAS_POSTMAN.md) para su alcance y límites. No se repitieron pruebas funcionales ni una auditoría de seguridad. Los ejemplos anteriores proceden del controlador, no de nuevas ejecuciones.

Se comprobó mediante comparación de árboles de sintaxis que los cambios de usuariosController.js, usuariosRoutes.js y db.js son exclusivamente comentarios y un salto de línea final. Las funciones, consultas SQL, rutas, validaciones y respuestas permanecen intactas.

El paquete académico independiente y su ZIP se conservan como artefactos locales de entrega. No se versionan sus copias del backend, ZIP, node_modules, archivos temporales ni archivos .env.
