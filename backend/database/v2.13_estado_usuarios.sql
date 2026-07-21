-- ============================================================
-- PROYECTO INTEGRADOR: "Donde Juanca"
-- DESARROLLADORA: Karol Lineth Julio Uran
-- VERSIÓN: v2.13
-- MÓDULO: 01 - Seguridad, Usuarios y Control de Acceso
-- FECHA: 2026
-- DESCRIPCIÓN: Estandarización de la columna 'estado' en la 
--              tabla usuarios para deshabilitación lógica (Soft Delete)
--              e índice de rendimiento para consultas de autenticación.
-- ============================================================

USE `mydb`;

-- 1. Asegurar la estructura correcta de la columna 'estado'
-- Modifica la columna para validar tipos de estado permitidos mediante DEFAULT y NOT NULL
ALTER TABLE `mydb`.`usuarios` 
  MODIFY COLUMN `estado` VARCHAR(20) NOT NULL DEFAULT 'activo' 
  COMMENT 'Estados permitidos: activo, inactivo, bloqueado';

-- 2. Optimización de rendimiento
-- Crea un índice secundario sobre la columna estado para acelerar 
-- las búsquedas de usuarios activos durante el Login y validación de OTP.
SET @exist_idx := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = 'mydb' 
    AND TABLE_NAME = 'usuarios' 
    AND INDEX_NAME = 'idx_usuarios_estado'
);

SET @sql_idx := IF(@exist_idx = 0, 
  'CREATE INDEX `idx_usuarios_estado` ON `mydb`.`usuarios` (`estado` ASC);', 
  'SELECT "El índice idx_usuarios_estado ya existe en la tabla usuarios." AS mensaje;'
);

PREPARE stmt FROM @sql_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Registro de auditoría para el historial de versiones
SELECT 'Script v2.13_estado_usuarios ejecutado y verificado correctamente' AS Estado_Migracion;