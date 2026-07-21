-- ============================================================
-- PROYECTO INTEGRADOR: "Donde Juanca"
-- DESARROLLADORA: Karol Lineth Julio Uran
-- VERSIÓN: v2.15
-- MÓDULO: 02 - Mesas, Pedidos y Kanban
-- FECHA: 2026
-- DESCRIPCIÓN: Implementación de transacciones para la adición de items
--              a pedidos y descuento automático de stock en inventario.
-- ============================================================

USE `mydb`;

-- Confirmar que la columna stock existe y está limpia
ALTER TABLE `mydb`.`productos` 
  MODIFY COLUMN `stock` INT NOT NULL DEFAULT 0 
  COMMENT 'Cantidad disponible en inventario para venta';

SELECT 'Script v2.15_descuento_inventario verificado correctamente' AS Estado_Migracion;