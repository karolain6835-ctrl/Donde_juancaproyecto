# Especificación de Requerimientos

## 🎯 Objetivo General
Autenticar de manera segura la identidad del usuario (Administrador u operativos) validando sus credenciales tradicionales o código OTP temporal, para generar un token de sesión (JWT) y otorgar el acceso al sistema basándose en el rol asignado.

## 👥 Historias de Usuario / Roles
Como usuario del sistema (Administrador y operativos), quiero iniciar sesión con usuario y contraseña o mediante un código OTP enviado a mi correo, para acceder de manera segura a las funciones correspondientes a mi rol.

## ⚙️ Requerimientos Funcionales
* El sistema debe solicitar y validar las credenciales de acceso (usuario/correo y contraseña encriptada con bcrypt) frente a los datos registrados en la base de datos.
* El sistema debe ofrecer un método de acceso *passwordless* alternativo, generando un código OTP (One-Time Password) aleatorio y enviándolo al correo electrónico registrado del usuario.
* Al autenticarse correctamente, el sistema debe generar un token JWT y registrarlo en la tabla `sesiones_activas`.
* El sistema debe redirigir al usuario al dashboard o interfaz correspondiente según su nivel de acceso (Administrador, Mesera, Encargada de juegos).
* El sistema debe registrar y contabilizar los intentos fallidos de autenticación en la tabla `usuarios`.

## 🚫 Restricciones o Casos de Borde
* El código OTP generado tendrá una vigencia estricta de 10 minutos y será de un solo uso; solicitar un segundo código OTP invalidará automáticamente el anterior.
* Tras registrar 5 intentos de acceso fallidos en una ventana de 15 minutos, el sistema bloqueará la cuenta automáticamente por 30 minutos.
* Solo puede existir una sesión activa por usuario a la vez. Si el usuario inicia sesión desde un dispositivo diferente, la sesión anterior en `sesiones_activas` quedará invalidada inmediatamente.
* Si un usuario inactivo, eliminado o bloqueado intenta solicitar un OTP o iniciar sesión, el sistema debe denegar el acceso sin emitir tokens.
* Las contraseñas nunca deben procesarse ni validarse en texto plano (se utilizará bcrypt) y en producción la transmisión debe estar protegida por HTTPS para evitar el robo de tokens.
