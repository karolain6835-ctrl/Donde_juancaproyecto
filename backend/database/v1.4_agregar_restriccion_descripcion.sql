-- ==========================================
-- MIGRACIÓN V1.4: Agregar restricción UNIQUE a descripcion
-- ==========================================
USE `mydb`;

-- Le damos un nombre explícito a la restricción (uq_descripcion) 
-- para que sea fácil borrarla después.
ALTER TABLE `categorias` 
ADD CONSTRAINT `uq_descripcion` UNIQUE (`descripcion`);