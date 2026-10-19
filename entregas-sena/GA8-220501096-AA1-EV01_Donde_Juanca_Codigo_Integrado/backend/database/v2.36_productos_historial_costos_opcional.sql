-- El historial legado pertenece a compras y no existe antes del alta de producto.
-- Conservar valores existentes, índice y FK; NULL representa ausencia de historial previo.
ALTER TABLE productos
 MODIFY COLUMN historial_costos_id VARCHAR(36) NULL DEFAULT NULL;
