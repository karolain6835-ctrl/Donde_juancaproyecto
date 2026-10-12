ALTER TABLE pagos
  ADD COLUMN verificado_en DATETIME NULL DEFAULT NULL,
  ADD INDEX idx_pagos_estado_verificacion_fecha
    (estado, verificacion_estado, verificado_en, id);
