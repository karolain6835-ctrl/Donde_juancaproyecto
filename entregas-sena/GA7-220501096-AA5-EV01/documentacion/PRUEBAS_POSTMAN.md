# Pruebas previas del servicio

**Evidencia:** GA7-220501096-AA5-EV01.

## Antecedente disponible

La aprendiz confirmó que `POST /api/usuarios/login` ya está implementado y que sus pruebas en Postman fueron exitosas. Durante la preparación de esta entrega no se repiten esas pruebas.

## Referencias del repositorio

En `postman/collections/Pruebas Donde juanca/` existen solicitudes denominadas:

- `http-localhost-5000-api-usuarios-login.request.yaml`
- `http-localhost-5000-api-usuarios-login-1.request.yaml`
- `http-localhost-5000-api-usuarios-login-2.request.yaml`

Estas referencias acreditan la existencia de definiciones de solicitudes; por sí solas no acreditan códigos de respuesta, fechas, tiempos, número de casos aprobados ni ejecuciones de todos los escenarios. No se incluyen sus cuerpos originales para evitar distribuir credenciales o datos de acceso.

## Descripción del uso de Postman

La operación documentada consiste en enviar POST a `/api/usuarios/login`, con `Content-Type: application/json` y cuerpo con `correo` y `contrasena`, y revisar la respuesta JSON. La confirmación disponible es la de pruebas exitosas indicada por la aprendiz. No se afirma una fecha, un código observado concreto, un tiempo de respuesta ni una cobertura de casos que no esté aportada.

## Límite de la evidencia disponible

No se aportaron capturas ni una exportación de resultados de ejecución. Si la rúbrica exige soporte visual, se deben adjuntar las capturas existentes de las pruebas ya realizadas, ocultando contraseñas y tokens. No es necesario volver a probar para completar esta documentación. Las respuestas del README se obtienen del código del controlador y se identifican como ejemplos ilustrativos.
