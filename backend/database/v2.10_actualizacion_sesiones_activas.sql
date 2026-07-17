-- ====================================================================
-- Actualización del Módulo de Seguridad - Tabla Sesiones Activas
-- v2.10 - 17 de Julio de 2026
-- ====================================================================

USE `mydb`;

SELECT 'Iniciando actualización de la tabla sesiones_activas...' AS Estado;

-- Agregar la columna creado_en para registrar la marca de tiempo del inicio de sesión
ALTER TABLE `sesiones_activas` 
  ADD COLUMN `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `id`;

SELECT 'Tabla sesiones_activas actualizada con la marca de tiempo creado_en con éxito!' AS Resultado;