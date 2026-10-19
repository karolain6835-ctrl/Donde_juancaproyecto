# Recuperación de contraseña: alcance V1

> Documento histórico del cierre V1. Desde el bloque post-V1 del 18 de octubre de 2026 existe una implementación nueva y separada: ver [recuperación segura post-V1](recuperacion-password-post-v1.md). La ruta antigua y `otp_tokens` siguen retirados/sin escrituras.

Recuperación por correo: fuera del alcance V1.
Requiere proveedor SMTP/API real y evolución segura de otp_tokens.

La ruta pública POST /api/usuarios/auth/otp/solicitar fue retirada, junto con su controlador simulado. Responde 404 como ruta inexistente para cualquier correo; no consulta usuarios ni genera códigos ni escribe OTP. No hay endpoints de verificación/restablecimiento ni acciones de recuperación en el frontend.

La tabla otp_tokens se conserva como legado incompleto, sin escrituras nuevas ni limpieza de históricos. La estructura local no coincide con v2.12: el id no es AUTO_INCREMENT y usuarios_id es VARCHAR(36). No se modificó esa migración ni se añadió una correctiva.

El login y el cambio de contraseña autenticado desde Perfil permanecen disponibles y separados de la recuperación.

Antes de habilitar recuperación deben implementarse entrega real, códigos criptográficos protegidos, expiración validada, límite de intentos, consumo único, token temporal por propósito, auditoría sin secretos y migración nueva. Nunca devolver códigos simulados ni revelar si el correo existe.

Las solicitudes históricas de Postman pueden conservar la URL retirada como evidencia histórica; no representan una función publicada de V1.
