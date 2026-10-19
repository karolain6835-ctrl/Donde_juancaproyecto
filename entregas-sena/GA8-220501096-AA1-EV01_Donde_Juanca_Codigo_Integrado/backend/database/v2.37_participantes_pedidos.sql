-- Identidad compartida con juegos. Los jugadores históricos conservan ámbito NULL.
ALTER TABLE pedidos MODIFY COLUMN clientes_id VARCHAR(36) NULL DEFAULT NULL;
ALTER TABLE jugadores MODIFY COLUMN nombre VARCHAR(100) NULL;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS pedido_id VARCHAR(36) NULL,
 ADD COLUMN IF NOT EXISTS clientes_id VARCHAR(36) NULL,
 ADD COLUMN IF NOT EXISTS tipo_participante ENUM('registrado','temporal') NULL,
 ADD COLUMN IF NOT EXISTS alias_temporal VARCHAR(100) GENERATED ALWAYS AS
 (CASE WHEN tipo_participante='temporal' THEN LOWER(TRIM(nombre)) ELSE NULL END) PERSISTENT,
 ADD UNIQUE INDEX IF NOT EXISTS uq_participante_cliente (pedido_id,clientes_id),
 ADD UNIQUE INDEX IF NOT EXISTS uq_participante_alias (pedido_id,alias_temporal);
ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS participante_id VARCHAR(36) NULL,
 ADD INDEX IF NOT EXISTS idx_item_participante (participante_id);
DELIMITER $$
CREATE OR REPLACE PROCEDURE migrar_participantes_pedidos()
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='jugadores' AND CONSTRAINT_NAME='fk_participante_pedido') THEN
  ALTER TABLE jugadores ADD CONSTRAINT fk_participante_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE RESTRICT ON UPDATE CASCADE;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='jugadores' AND CONSTRAINT_NAME='fk_participante_cliente') THEN
  ALTER TABLE jugadores ADD CONSTRAINT fk_participante_cliente FOREIGN KEY (clientes_id) REFERENCES clientes(id) ON DELETE RESTRICT ON UPDATE CASCADE;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='pedido_items' AND CONSTRAINT_NAME='fk_item_participante') THEN
  ALTER TABLE pedido_items ADD CONSTRAINT fk_item_participante FOREIGN KEY (participante_id) REFERENCES jugadores(id) ON DELETE RESTRICT ON UPDATE CASCADE;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='jugadores' AND CONSTRAINT_NAME='chk_participante_identidad') THEN
  ALTER TABLE jugadores ADD CONSTRAINT chk_participante_identidad CHECK (pedido_id IS NULL OR
    (tipo_participante IS NOT NULL AND nombre IS NOT NULL AND CHAR_LENGTH(TRIM(nombre))>0 AND
     ((tipo_participante='registrado' AND clientes_id IS NOT NULL) OR (tipo_participante='temporal' AND clientes_id IS NULL))));
 END IF;
END$$
DELIMITER ;
CALL migrar_participantes_pedidos();
DROP PROCEDURE migrar_participantes_pedidos;
