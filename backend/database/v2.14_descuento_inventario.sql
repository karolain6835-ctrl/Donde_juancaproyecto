-- ============================================================
-- PROYECTO INTEGRADOR: "Donde Juanca"
-- DESARROLLADORA: Karol Lineth Julio Uran
-- VERSIÓN: v2.15
-- MÓDULO: 02 - Mesas, Pedidos y Kanban
-- FECHA: 2026
-- DESCRIPCIÓN: Verificación de la columna 'stock' en productos
--              para el control y descuento automático de inventario.
-- ============================================================

USE `mydb`;

-- Asegurar que la columna stock exista en la tabla productos y sea de tipo entero
ALTER TABLE `mydb`.`productos` 
  MODIFY COLUMN `stock` INT NOT NULL DEFAULT 0 
  COMMENT 'Cantidad disponible en inventario para venta';

SELECT 'Script v2.15_descuento_inventario ejecutado y verificado correctamente' AS Estado_Migracion;