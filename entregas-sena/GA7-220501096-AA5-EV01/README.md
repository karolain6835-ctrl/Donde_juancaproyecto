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

Documentar y entregar una versión ejecutable e independiente del servicio REST de autenticación, mostrando su organización, contrato HTTP, validaciones y dependencias, sin modificar la lógica del proyecto original.

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

```text
Cliente HTTP / Postman
        │ POST /api/usuarios/login (JSON)
        ▼
Express → loginRoutes → usuariosController.loginUsuario
                              │
                    mysql2 → MySQL (usuarios y roles)
                              │
                    bcrypt → validación de contraseña
                              │
                    JWT → respuesta JSON
```

```text
GA7-220501096-AA5-EV01/
  README.md
  REPOSITORIO_GITHUB.txt
  .env.example
  .gitignore
  package.json
  package-lock.json
  src/
    index.js
    routes/loginRoutes.js
    controllers/usuariosController.js
    config/db.js
  database/esquema-login.sql
  documentacion/PROCEDENCIA.md
  documentacion/PRUEBAS_POSTMAN.md
  documentacion/VERIFICACION_EMPAQUETADO.md
```

El controlador y la conexión son copias del código existente, con comentarios explicativos. Se conserva el controlador completo para evitar recortar o reescribir sus funciones, pero solo `loginUsuario` se registra como ruta. Las funciones de registro, administración y OTP permanecen sin exponer y no forman parte del alcance ejecutable. No se necesitan sus tablas o middlewares para atender el login.

La entrada independiente carga dotenv, procesa JSON y monta la misma declaración POST del proyecto. No importa código fuera de la carpeta de entrega ni necesita el frontend. CORS no se incluye porque la ejecución prevista es mediante Postman o clientes HTTP; la integración con un frontend de otro origen no forma parte de este paquete.

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

## Instalación y ejecución independiente

### Requisitos

- Node.js 20 o superior y npm; para preparar el paquete se utilizó Node.js 24.
- Servidor MySQL 8 disponible, con permisos para crear el esquema en un entorno local autorizado, o un esquema compatible ya preparado.
- Acceso al registro npm durante la instalación. bcrypt utiliza binarios nativos; si no existe un binario compatible, su instalación puede requerir herramientas de compilación de Node.js.
- Cuenta de aplicación activa en `usuarios`, con hash bcrypt válido y una fila relacionada en `roles`.

### 1. Instalar dependencias

Descomprime el ZIP y abre una terminal en la carpeta que contiene `package.json`:

```bash
npm install
```

El lockfile incluido permite alternativamente `npm ci`. En PowerShell, si se bloquea `npm.ps1`, utiliza `npm.cmd` en lugar de `npm`.

### 2. Preparar la configuración local

Copia `.env.example` como `.env`:

```powershell
Copy-Item .env.example .env
```

Completa localmente `DB_USER`, `DB_PASSWORD` y `JWT_SECRET`. Mantén el host, puerto y nombre de base acordes con tu instalación. No compartas ese archivo. Genera tu propio secreto con:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado a `JWT_SECRET` sin publicarlo. `JWT_EXPIRES_IN_SECONDS` debe ser un entero positivo. Si el puerto 5000 está ocupado por el proyecto original, utiliza otro `PORT` y ajusta la URL del cliente.

### 3. Preparar MySQL

En una instancia local autorizada, ejecuta `database/esquema-login.sql` con MySQL Workbench o el cliente MySQL. Crea el esquema independiente `dondejuanca_sena_auth` y las tablas `roles` y `usuarios`; no inserta datos. Las definiciones se extraen del esquema original y se cambia únicamente el nombre del esquema.

Alternativamente, apunta `DB_NAME` a la base existente de Donde Juanca que ya tenga las tablas y la cuenta utilizadas en las pruebas previas. No ejecutes el DDL académico sobre la base original. Un login exitoso actualiza `ultimo_acceso`, por lo que esta alternativa utiliza datos reales del entorno elegido.

Para un esquema nuevo, un administrador debe cargar una fila de `roles` y una cuenta en `usuarios` usando el procedimiento de alta existente del proyecto. También puede prepararlas manualmente en Workbench con valores propios: `id` (hasta 36 caracteres), `nombre`, `email`, `password_hash`, `estado='activo'` y `roles_id` correspondiente. El campo `password_hash` debe contener el resultado de `bcrypt.hash(contraseñaLocal, 12)`, nunca la contraseña en texto plano. No se incluye una cuenta predeterminada ni un nuevo endpoint de registro. Sin estas filas, el servidor puede iniciarse, pero no habrá un acceso exitoso.

### 4. Iniciar el servicio

Ejecuta desde la carpeta de entrega para que dotenv encuentre `.env`:

```bash
npm start
```

La URL predeterminada es `http://localhost:5000/api/usuarios/login`. El mensaje de escucha del servidor no garantiza la conexión MySQL: la conexión informa por separado su disponibilidad. Detén el proceso con Ctrl+C.

## Pruebas previas en Postman

La aprendiz informó que el login ya fue probado exitosamente en Postman. Se conserva ese antecedente sin repetir la ejecución. El repositorio contiene solicitudes de login, pero no se dispone en esta entrega de un informe de ejecución o capturas verificables que permitan atribuir resultados concretos a cada caso de error.

Consulta `documentacion/PRUEBAS_POSTMAN.md` para la trazabilidad disponible. Los ejemplos y códigos anteriores proceden del controlador, no representan pruebas nuevas ni resultados inventados. No se copian solicitudes originales con credenciales al ZIP.

## Alcance de la comprobación de entrega

Se verifica sintaxis JavaScript, dependencias declaradas, importaciones locales, igualdad de los archivos reutilizados y contenido del ZIP. No se realiza una nueva auditoría de seguridad, instalación de dependencias, conexión a MySQL ni ejecución funcional del login. Los detalles se registran en `documentacion/VERIFICACION_EMPAQUETADO.md`.

Para ejecutar en otro equipo deben suministrarse localmente las credenciales MySQL, el secreto JWT y una cuenta válida. Son datos de configuración deliberadamente excluidos de la entrega.
