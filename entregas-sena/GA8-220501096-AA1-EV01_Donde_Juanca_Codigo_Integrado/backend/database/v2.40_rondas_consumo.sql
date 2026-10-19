CREATE TABLE IF NOT EXISTS rondas_consumo (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 pedido_id VARCHAR(36) NOT NULL,
 numero_ronda INT UNSIGNED NOT NULL,
 estado ENUM('confirmada','cancelada') NOT NULL DEFAULT 'confirmada',
 creada_en DATETIME NOT NULL,
 creada_por VARCHAR(36) NOT NULL,
 idempotencia_clave VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 solicitud_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 UNIQUE KEY uq_ronda_numero(pedido_id,numero_ronda),
 UNIQUE KEY uq_ronda_idempotencia(pedido_id,idempotencia_clave),
 KEY idx_ronda_pedido(pedido_id),
 CONSTRAINT fk_ronda_pedido FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_ronda_actor FOREIGN KEY(creada_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS ronda_consumo_id VARCHAR(36) NULL,
 ADD INDEX IF NOT EXISTS idx_item_ronda(ronda_consumo_id);
DELIMITER $$
CREATE OR REPLACE PROCEDURE migrar_rondas_consumo()
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='pedido_items' AND CONSTRAINT_NAME='fk_item_ronda_consumo') THEN
  ALTER TABLE pedido_items ADD CONSTRAINT fk_item_ronda_consumo FOREIGN KEY(ronda_consumo_id) REFERENCES rondas_consumo(id) ON DELETE RESTRICT ON UPDATE CASCADE;
 END IF;
END$$
DELIMITER ;
CALL migrar_rondas_consumo();
DROP PROCEDURE migrar_rondas_consumo;
