-- ====================================================================
-- Módulo de Ventas y Facturación - API & Consistencia de Datos
-- v2.4 - 16 de Julio de 2026
-- ====================================================================

USE `mydb`;

-- 1. Documentación del Estado de la Migración
SELECT 'Inicializando estandarización de políticas de integridad para Ventas y Facturación' AS Estado;

-- 2. Ajuste de Integridad Referencial en la tabla `pedido_items`
-- Aseguramos que si cambia el ID de un pedido o de un producto, se actualice en cascada.
ALTER TABLE `pedido_items` DROP FOREIGN KEY `fk_pedido_items_pedidos1`;
ALTER TABLE `pedido_items` 
ADD CONSTRAINT `fk_pedido_items_pedidos1`
  FOREIGN KEY (`pedidos_id`) 
  REFERENCES `pedidos` (`id`)
  ON DELETE CASCADE   -- Si se elimina un pedido, se borran sus items automáticamente
  ON UPDATE CASCADE;

ALTER TABLE `pedido_items` DROP FOREIGN KEY `fk_pedido_items_productos1`;
ALTER TABLE `pedido_items` 
ADD CONSTRAINT `fk_pedido_items_productos1`
  FOREIGN KEY (`productos_id`) 
  REFERENCES `productos` (`id`)
  ON DELETE NO ACTION
  ON UPDATE CASCADE;

-- 3. Ajuste de Integridad Referencial en la tabla `facturas` (o ventas)
-- Asociamos de forma segura la factura al pedido correspondiente con cascada de actualización.
ALTER TABLE `facturas` DROP FOREIGN KEY `fk_facturas_pedidos1`;
ALTER TABLE `facturas` 
ADD CONSTRAINT `fk_facturas_pedidos1`
  FOREIGN KEY (`pedidos_id`) 
  REFERENCES `pedidos` (`id`)
  ON DELETE NO ACTION
  ON UPDATE CASCADE;

-- 4. Confirmación de la correcta ejecución del script
SELECT 'Módulo de ventas, pedidos y facturación alineado con políticas CASCADE con éxito' AS Resultado;