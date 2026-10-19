# Manejo de errores V1

El manejador global anterior devolvía `detalles: err.message`, y registrar pagos también exponía el mensaje técnico en un 500. Ambos se retiraron.

`protegerErroresInternos`, instalado antes de `express.json`, normaliza respuestas JSON 5xx de controladores con catch o callbacks a `{ "error": "Error interno del servidor." }`, manteniendo su estado HTTP. No expone detalles, códigos SQL ni stacks. Los consumidores conservan el campo `error` habitual. No cambia respuestas exitosas ni mensajes de negocio 4xx.

`manejarError`, instalado después de todas las rutas, cubre excepciones y rechazos async de Express 5. Los errores internos sin clasificación segura responden 500; los estados operacionales existentes 400/401/403/404/409 conservan su mensaje. Errores del driver SQL no se consideran mensajes operacionales por tener un status: las traducciones explícitas de conflicto ya existentes siguen en los controladores. JSON mal formado responde 400 con texto fijo; payload demasiado grande 413 y codificación no soportada 415. Si ya se enviaron headers, se delega un error genérico para cerrar la respuesta sin revelar el original.

Logging sin dependencia nueva: el middleware registra contexto, método y plantilla de ruta (sin URL, parámetros o query), tipo y códigos técnicos de una lista permitida, además de una traza generada en el punto de manejo. No serializa el error recibido, su message, stack original, SQL, body, headers, credenciales, OTP o tokens. Los logs locales de controladores, servicios y conexión mantienen etiquetas estáticas y trazas nuevas con texto genérico, en lugar de imprimir errores originales potencialmente sensibles. Esto permite localizar la operación fallida sin conservar valores de negocio o secretos de una consulta. Los paths internos pueden aparecer únicamente en estas trazas del servidor.

No se modifican reglas de autenticación, pagos, stock, compras, pedidos ni juegos. Sus archivos adaptan logging; el registro de pagos además retira el campo filtrado. Los catches de validación de Auditoría, Configuración, Perfil, Refrigeradores y Divisiones conservan sus errores operacionales conocidos y clasifican una excepción inesperada como 500. El proyecto no tiene un script de lint backend. No hubo cambios frontend: apiClient ya consume el campo error y no necesita detalles técnicos de 500. Las pruebas frontend con mensajes 500 propios son fixtures, no un contrato de SQL o stack.

## Archivos de este bloque

- `backend/docs/errores-backend-v1.md`
- `backend/src/config/db.js`
- `backend/src/controllers/alertasInventarioController.js`
- `backend/src/controllers/auditoriaController.js`
- `backend/src/controllers/categoriasController.js`
- `backend/src/controllers/clientesController.js`
- `backend/src/controllers/configuracionController.js`
- `backend/src/controllers/divisionContextoController.js`
- `backend/src/controllers/divisionPagosController.js`
- `backend/src/controllers/divisionesController.js`
- `backend/src/controllers/inventarioController.js`
- `backend/src/controllers/juegosController.js`
- `backend/src/controllers/kanbanController.js`
- `backend/src/controllers/mermasController.js`
- `backend/src/controllers/mesasAdministracionController.js`
- `backend/src/controllers/mesasController.js`
- `backend/src/controllers/pagosController.js`
- `backend/src/controllers/participantesController.js`
- `backend/src/controllers/pedidosController.js`
- `backend/src/controllers/perfilController.js`
- `backend/src/controllers/productosController.js`
- `backend/src/controllers/refrigeradoresController.js`
- `backend/src/controllers/rondasConsumoController.js`
- `backend/src/controllers/sesionesMesaController.js`
- `backend/src/controllers/usuariosController.js`
- `backend/src/index.js`
- `backend/src/middleware/errorMiddleware.js`
- `backend/src/services/cierresCajaService.js`
- `backend/src/services/comprasService.js`
- `backend/src/services/comprobantesService.js`
- `backend/src/services/errorLog.js`
- `backend/tests/auth-middleware.test.js`
- `backend/tests/endpoints-simulados-retirados.test.js`
- `backend/tests/error-middleware.test.js`
- `backend/tests/otp-retirado.test.js`
