CREATE TABLE historial_costos_recepciones (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 productos_id VARCHAR(36) NOT NULL,
 compras_id VARCHAR(36) NOT NULL,
 recepcion_compra_items_id VARCHAR(36) NOT NULL,
 evento ENUM('recepcion','reverso') NOT NULL,
 cantidad INT NOT NULL,
 costo_unitario DECIMAL(10,2) NOT NULL,
 stock_antes INT NOT NULL,
 stock_despues INT NOT NULL,
 cpp_antes DECIMAL(10,2) NOT NULL,
 cpp_despues DECIMAL(10,2) NOT NULL,
 version_antes BIGINT UNSIGNED NOT NULL,
 version_despues BIGINT UNSIGNED NOT NULL,
 residuo_redondeo_centavos BIGINT NOT NULL,
 usuarios_id VARCHAR(36) NOT NULL,
 creado_en DATETIME NOT NULL,
 UNIQUE KEY uq_historial_recepcion_evento (recepcion_compra_items_id,evento),
 KEY idx_historial_producto_fecha (productos_id,creado_en,id),
 KEY idx_historial_compra_fecha (compras_id,creado_en,id),
 CONSTRAINT fk_historial_recepcion_producto FOREIGN KEY (productos_id) REFERENCES productos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_historial_recepcion_compra FOREIGN KEY (compras_id) REFERENCES compras(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_historial_recepcion_linea FOREIGN KEY (recepcion_compra_items_id) REFERENCES recepcion_compra_items(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_historial_recepcion_usuario FOREIGN KEY (usuarios_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT chk_historial_recepcion_valores CHECK (
 stock_antes>=0 AND stock_despues>=0 AND costo_unitario>=0 AND cpp_antes>=0 AND cpp_despues>=0
 AND stock_despues=stock_antes+cantidad AND version_despues=version_antes+1
 AND ((evento='recepcion' AND cantidad>0) OR (evento='reverso' AND cantidad<0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
