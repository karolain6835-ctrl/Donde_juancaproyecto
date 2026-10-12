ALTER TABLE cierres_caja
  ADD COLUMN fecha_inicio DATETIME NULL DEFAULT NULL,
  ADD COLUMN fecha_fin DATETIME NULL DEFAULT NULL,
  ADD INDEX idx_cierres_periodo (fecha_inicio, fecha_fin),
  ADD CONSTRAINT chk_cierres_periodo
    CHECK (
      (fecha_inicio IS NULL AND fecha_fin IS NULL)
      OR (
        fecha_inicio IS NOT NULL
        AND fecha_fin IS NOT NULL
        AND fecha_inicio < fecha_fin
      )
    );
