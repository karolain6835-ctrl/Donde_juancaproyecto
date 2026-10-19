CREATE TABLE cierre_pagos (
  id VARCHAR(36) NOT NULL,
  cierres_caja_id VARCHAR(36) NOT NULL,
  pagos_id VARCHAR(20) NOT NULL,
  importe DECIMAL(12,2) NOT NULL,
  metodo_de_pago ENUM('efectivo','nequi','daviplata','tarjeta') NOT NULL,
  incluido_en DATETIME NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_cierre_pagos_pago (pagos_id),
  KEY idx_cierre_pagos_cierre_metodo
    (cierres_caja_id, metodo_de_pago),

  CONSTRAINT fk_cierre_pagos_cierre
    FOREIGN KEY (cierres_caja_id) REFERENCES cierres_caja (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_cierre_pagos_pago
    FOREIGN KEY (pagos_id) REFERENCES pagos (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_cierre_pagos_importe
    CHECK (importe > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8
  COLLATE=utf8_general_ci;
