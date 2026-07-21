-- =================================================================
-- Sección: Cálculo de Cuenta Consolidada y Pre-facturación
-- v2.11 - 21 de Julio de 2026
-- =================================================================

USE `mydb`;

SELECT 'Inicializando estructuras para consolidación de cuenta...' AS Estado;

-- 1. Asegurar que la tabla de pedidos contenga los campos de totalización
-- (Asegura campos para subtotal de consumo y tiempo de juego)
ALTER TABLE `pedidos` 
  ADD COLUMN IF NOT EXISTS `total_productos` DECIMAL(10,2) DEFAULT 0.00 AFTER `estado`,
  ADD COLUMN IF NOT EXISTS `total_juegos` DECIMAL(10,2) DEFAULT 0.00 AFTER `total_productos`,
  ADD COLUMN IF NOT EXISTS `total_general` DECIMAL(10,2) DEFAULT 0.00 AFTER `total_juegos`;

-- 2. Asegurar vista/consulta rápida para la pre-factura
SELECT 'Migración v2.11 aplicada exitosamente.' AS Resultado;