-- ==========================================
-- MIGRACIÓN V1.3: Ampliar el límite de caracteres de la columna icono
-- ==========================================
USE `mydb`;

-- Cambiamos el tipo de dato de VARCHAR(50) a VARCHAR(255)
ALTER TABLE `categorias` 
MODIFY COLUMN `icono` VARCHAR(255) DEFAULT NULL;