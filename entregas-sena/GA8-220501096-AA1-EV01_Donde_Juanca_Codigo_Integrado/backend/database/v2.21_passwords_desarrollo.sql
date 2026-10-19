-- v2.21 - 2026-10-09. Inicialización optativa de credenciales de desarrollo.
-- Ejecutar mediante scripts/inicializar-login-desarrollo.js para generar bcrypt
-- con sal propia y proporcionar las variables mediante parámetros preparados.
-- No contiene contraseñas ni hashes fijos. Sin variables definidas no modifica filas.
-- Solo cambia password_hash; conserva estado, rol y demás datos del usuario.
UPDATE usuarios
SET password_hash = @dev_bcrypt_hash
WHERE id = @dev_usuario_id
  AND id IN ('user-001', 'usr-001', 'usr-002', 'usr-003', 'usr-004', 'usr-005')
  AND BINARY password_hash = BINARY @dev_hash_anterior
  AND @dev_bcrypt_hash REGEXP '^[$]2[ab][$](0[4-9]|[12][0-9]|3[01])[$][./A-Za-z0-9]{53}$';
