-- Conservar históricos; no inferir estados finales ni visitas.
ALTER TABLE sesiones_division_cuentas
 MODIFY COLUMN modalidad ENUM('items','equitativa','total','personalizada') NOT NULL,
 ADD COLUMN estado ENUM('activa','completada','cancelada') NOT NULL DEFAULT 'activa',
 ADD COLUMN completada_en DATETIME NULL,
 ADD COLUMN cancelada_en DATETIME NULL,
 ADD COLUMN pedido_id VARCHAR(36) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
 ADD COLUMN total_objetivo DECIMAL(12,2) NULL,
 ADD COLUMN total_cuenta_base DECIMAL(12,2) NULL,
 ADD COLUMN cuotas_clave VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD COLUMN cuotas_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 ADD COLUMN cuentas_items_json LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL CHECK (cuentas_items_json IS NULL OR JSON_VALID(cuentas_items_json)),
 ADD KEY idx_division_estado_mesa (mesas_id,estado),
 ADD KEY idx_division_pedido (pedido_id),
 ADD CONSTRAINT fk_division_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD CONSTRAINT chk_division_ciclo CHECK (
  (estado='activa' AND completada_en IS NULL AND cancelada_en IS NULL) OR
  (estado='completada' AND completada_en IS NOT NULL AND cancelada_en IS NULL) OR
  (estado='cancelada' AND cancelada_en IS NOT NULL AND completada_en IS NULL));
