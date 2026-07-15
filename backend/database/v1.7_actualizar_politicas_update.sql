-- ==========================================
-- MIGRACIÓN V1.7: Estandarizar políticas ON UPDATE CASCADE
-- ==========================================
USE `mydb`;

-- Ejemplo aplicado a usuarios/clientes
ALTER TABLE `clientes` DROP FOREIGN KEY `fk_clientes_usuarios1`;
ALTER TABLE `clientes` 
ADD CONSTRAINT `fk_clientes_usuarios1`
FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`)
ON DELETE NO ACTION -- Mantenemos NO ACTION según tu diseño original
ON UPDATE CASCADE;  -- Aplicamos la política solicitada en 3.4.9

-- Ejemplo aplicado a pedidos/mesas
ALTER TABLE `pedidos` DROP FOREIGN KEY `fk_pedidos_mesas1`;
ALTER TABLE `pedidos` 
ADD CONSTRAINT `fk_pedidos_mesas1`
FOREIGN KEY (`mesas_id`) REFERENCES `mesas` (`id`)
ON DELETE NO ACTION
ON UPDATE CASCADE;