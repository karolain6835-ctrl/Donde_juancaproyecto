ALTER TABLE sesiones_juego
  ADD COLUMN fecha_inicio DATETIME NULL DEFAULT NULL,
  ADD COLUMN fecha_fin DATETIME NULL DEFAULT NULL,
  ADD COLUMN tarifa_hora_aplicada DECIMAL(10,2) NULL DEFAULT NULL,
  MODIFY COLUMN cerrada_por VARCHAR(36) NULL DEFAULT NULL,
  ADD INDEX idx_sesiones_activo_estado (activos_juego_id, estado),
  ADD INDEX idx_sesiones_mesa_estado (mesas_id, estado),
  ADD INDEX idx_sesiones_estado_inicio (estado, fecha_inicio, id);
