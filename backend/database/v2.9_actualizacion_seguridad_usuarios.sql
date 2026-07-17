-- ====================================================================
-- Actualización del Módulo de Seguridad - Tabla Usuarios
-- v2.9 - 16 de Julio de 2026
-- ====================================================================

USE `mydb`;

SELECT 'Iniciando actualización de seguridad para la tabla usuarios...' AS Estado;

-- Agregar los campos faltantes para control de bloqueos y políticas de contraseña
ALTER TABLE `usuarios` 
  ADD COLUMN `ultimo_intento` DATETIME NULL AFTER `intentos_fallidos`,
  ADD COLUMN `bloqueado_hasta` DATETIME NULL AFTER `ultimo_intento`,
  ADD COLUMN `requiere_cambio_pwd` BOOLEAN NOT NULL DEFAULT TRUE AFTER `bloqueado_hasta`;

SELECT 'Tabla usuarios actualizada con políticas avanzadas de seguridad con éxito!' AS Resultado;