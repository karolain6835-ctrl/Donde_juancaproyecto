CREATE TABLE recepciones_compra (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 compras_id VARCHAR(36) NOT NULL,
 estado ENUM('confirmada','reversada') NOT NULL,
 recibida_por VARCHAR(36) NOT NULL,
 recibida_en DATETIME NOT NULL,
 clave_idempotencia VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 reversada_por VARCHAR(36) NULL,
 reversada_en DATETIME NULL,
 motivo_reverso VARCHAR(500) NULL,
 UNIQUE KEY uq_recepcion_idempotencia (compras_id,clave_idempotencia),
 KEY idx_recepcion_compra_fecha (compras_id,recibida_en,id),
 KEY idx_recepcion_receptor_fecha (recibida_por,recibida_en),
 CONSTRAINT fk_recepcion_compra FOREIGN KEY (compras_id) REFERENCES compras(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_recepcion_receptor FOREIGN KEY (recibida_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_recepcion_reversor FOREIGN KEY (reversada_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT chk_recepcion_reverso CHECK (
 (estado='confirmada' AND reversada_por IS NULL AND reversada_en IS NULL AND motivo_reverso IS NULL)
 OR (estado='reversada' AND reversada_por IS NOT NULL AND reversada_en IS NOT NULL AND motivo_reverso IS NOT NULL AND CHAR_LENGTH(TRIM(motivo_reverso))>0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
CREATE TABLE recepcion_compra_items (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 recepciones_compra_id VARCHAR(36) NOT NULL,
 compra_items_id VARCHAR(36) NOT NULL,
 productos_id VARCHAR(36) NOT NULL,
 cantidad_recibida INT NOT NULL,
 precio_unitario DECIMAL(10,2) NOT NULL,
 movimiento_entrada_id VARCHAR(36) NOT NULL,
 movimiento_reverso_id VARCHAR(36) NULL,
 UNIQUE KEY uq_recepcion_item (recepciones_compra_id,compra_items_id),
 UNIQUE KEY uq_recepcion_entrada (movimiento_entrada_id),
 UNIQUE KEY uq_recepcion_reverso (movimiento_reverso_id),
 CONSTRAINT fk_recepcion_item_cabecera FOREIGN KEY (recepciones_compra_id) REFERENCES recepciones_compra(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_recepcion_item_compra FOREIGN KEY (compra_items_id) REFERENCES compra_items(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_recepcion_item_producto FOREIGN KEY (productos_id) REFERENCES productos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_recepcion_item_entrada FOREIGN KEY (movimiento_entrada_id) REFERENCES movimientos_inventario(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_recepcion_item_reverso FOREIGN KEY (movimiento_reverso_id) REFERENCES movimientos_inventario(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT chk_recepcion_item_cantidad CHECK (cantidad_recibida>0 AND precio_unitario>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
