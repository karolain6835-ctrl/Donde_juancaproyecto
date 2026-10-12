CREATE TABLE comprobante_items (
  id VARCHAR(36) NOT NULL,
  comprobantes_id VARCHAR(36) NOT NULL,
  renglon INT UNSIGNED NOT NULL,
  tipo ENUM('producto','juego') NOT NULL,
  referencia_id VARCHAR(36) NOT NULL,
  descripcion VARCHAR(100) NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_comprobante_renglon (comprobantes_id, renglon),
  UNIQUE KEY uq_comprobante_origen
    (comprobantes_id, tipo, referencia_id),

  CONSTRAINT fk_comprobante_items_comprobante
    FOREIGN KEY (comprobantes_id) REFERENCES comprobantes (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_comprobante_items_importes
    CHECK (
      renglon > 0
      AND cantidad > 0
      AND precio_unitario >= 0
      AND subtotal = cantidad * precio_unitario
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8
  COLLATE=utf8_general_ci;
