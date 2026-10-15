-- Nuevas sesiones cargan directamente al pedido; conservar referencias históricas.
ALTER TABLE sesiones_juego
 ADD COLUMN IF NOT EXISTS pedidos_id VARCHAR(36) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
 MODIFY COLUMN pedido_items_id VARCHAR(36) NULL DEFAULT NULL,
 ADD INDEX IF NOT EXISTS idx_sesion_juego_pedido (pedidos_id);
DELIMITER $$
CREATE OR REPLACE PROCEDURE migrar_juegos_pedido_directo()
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='sesiones_juego' AND CONSTRAINT_NAME='fk_sesion_juego_pedido') THEN
  ALTER TABLE sesiones_juego ADD CONSTRAINT fk_sesion_juego_pedido FOREIGN KEY (pedidos_id) REFERENCES pedidos(id) ON DELETE RESTRICT ON UPDATE CASCADE;
 END IF;
 -- No inferir por mesa/fecha. No sobrescribir una referencia directa existente.
 UPDATE sesiones_juego sj
 JOIN pedido_items pi ON pi.id=sj.pedido_items_id
 JOIN pedidos p ON p.id=pi.pedidos_id
 SET sj.pedidos_id=p.id
 WHERE sj.pedidos_id IS NULL AND pi.pedido_id=pi.pedidos_id;
END$$
DELIMITER ;
CALL migrar_juegos_pedido_directo();
DROP PROCEDURE migrar_juegos_pedido_directo;
