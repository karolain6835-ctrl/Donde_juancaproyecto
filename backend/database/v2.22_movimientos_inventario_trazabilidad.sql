-- Ejecutar una sola vez sobre la base configurada para el backend.
-- Los registros anteriores conservan fecha y referencia desconocidas (NULL).
ALTER TABLE movimientos_inventario
  ADD COLUMN creado_en DATETIME NULL DEFAULT NULL,
  ADD COLUMN referencia_id VARCHAR(36) NULL DEFAULT NULL,
  ADD INDEX idx_movimientos_fecha_id (creado_en, id);
