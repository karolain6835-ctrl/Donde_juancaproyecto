-- ==========================================
-- MIGRACIÓN V1.5: Eliminar restricción UNIQUE de descripcion
-- ==========================================
USE `mydb`;

-- Usamos el nombre que le asignamos en la migración anterior (uq_descripcion)
-- para soltar la restricción.
ALTER TABLE `categorias` 
DROP INDEX `uq_descripcion`;