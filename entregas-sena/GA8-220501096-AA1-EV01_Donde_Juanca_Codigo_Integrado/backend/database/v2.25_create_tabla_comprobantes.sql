CREATE TABLE comprobantes (
  id VARCHAR(36) NOT NULL,
  numero BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedidos_id VARCHAR(36) NOT NULL,
  clientes_id VARCHAR(36) NOT NULL,
  cliente_nombre VARCHAR(100) NOT NULL,
  usuarios_id VARCHAR(36) NOT NULL,
  emitido_en DATETIME NOT NULL,
  total_productos DECIMAL(12,2) NOT NULL,
  total_juegos DECIMAL(12,2) NOT NULL,
  total_general DECIMAL(12,2) NOT NULL,
  total_pagado DECIMAL(12,2) NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_comprobantes_numero (numero),
  UNIQUE KEY uq_comprobantes_pedido (pedidos_id),
  KEY idx_comprobantes_fecha_id (emitido_en, id),
  KEY idx_comprobantes_cliente (clientes_id),
  KEY idx_comprobantes_usuario (usuarios_id),

  CONSTRAINT fk_comprobantes_pedido
    FOREIGN KEY (pedidos_id) REFERENCES pedidos (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_comprobantes_cliente
    FOREIGN KEY (clientes_id) REFERENCES clientes (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_comprobantes_usuario
    FOREIGN KEY (usuarios_id) REFERENCES usuarios (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT chk_comprobantes_importes
    CHECK (
      total_productos >= 0
      AND total_juegos >= 0
      AND total_general = total_productos + total_juegos
      AND total_pagado = total_general
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8
  COLLATE=utf8_general_ci;
