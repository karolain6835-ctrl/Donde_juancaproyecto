ALTER TABLE cierres_caja
  MODIFY COLUMN total_efectivo_esperado DECIMAL(12,2) NOT NULL,
  MODIFY COLUMN total_efectivo_real DECIMAL(12,2) NOT NULL,
  MODIFY COLUMN diferencia_efectivo DECIMAL(12,2) NOT NULL,
  MODIFY COLUMN total_general DECIMAL(12,2) NOT NULL;
