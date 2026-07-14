-- ==========================================
-- MIGRACIÓN V1.2: Agregar columna icono a las categorías
-- ==========================================
USE `mydb`;

-- Agregamos la columna 'icono' de tipo texto. 
-- Le ponemos 'DEFAULT NULL' para que las categorías viejas no den error si no tienen icono.
-- 'AFTER descripcion' indica en qué posición exacta de la tabla queremos que aparezca.
ALTER TABLE `categorias` 
ADD COLUMN `icono` VARCHAR(50) DEFAULT NULL AFTER `descripcion`;