-- ==========================================
-- MIGRACIÓN V1.6: Definir políticas ON DELETE y ON UPDATE
-- ==========================================
USE `mydb`;

-- Si tienes una tabla de productos que referencia a categorías, 
-- el comando sería similar a este:
ALTER TABLE `productos`
DROP FOREIGN KEY `fk_producto_categoria`; -- Primero quitamos la vieja

ALTER TABLE `productos`
ADD CONSTRAINT `fk_producto_categoria`
FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`)
ON DELETE RESTRICT 
ON UPDATE CASCADE;