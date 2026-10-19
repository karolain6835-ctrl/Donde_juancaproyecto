-- Visitas reales desde esta versión. No inferir sesiones para datos históricos.
CREATE TABLE IF NOT EXISTS sesiones_mesa (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 mesas_id VARCHAR(36) NOT NULL,
 estado ENUM('activa','cerrada') NOT NULL DEFAULT 'activa',
 iniciada_en DATETIME NOT NULL,
 cerrada_en DATETIME NULL,
 mesa_activa VARCHAR(36) GENERATED ALWAYS AS (CASE WHEN estado='activa' THEN mesas_id ELSE NULL END) PERSISTENT,
 UNIQUE KEY uq_sesion_mesa_activa (mesa_activa),
 KEY idx_sesion_mesa_fecha (mesas_id,iniciada_en,id),
 CONSTRAINT fk_sesion_mesa FOREIGN KEY(mesas_id) REFERENCES mesas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT chk_sesion_mesa_cierre CHECK ((estado='activa' AND cerrada_en IS NULL) OR (estado='cerrada' AND cerrada_en IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS sesion_mesa_id VARCHAR(36) NULL,
 ADD INDEX IF NOT EXISTS idx_pedido_sesion_mesa (sesion_mesa_id);
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS sesion_mesa_id VARCHAR(36) NULL,
 ADD UNIQUE INDEX IF NOT EXISTS uq_participante_sesion_cliente (sesion_mesa_id,clientes_id);
DELIMITER $$
CREATE OR REPLACE PROCEDURE migrar_sesiones_mesa()
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='pedidos' AND CONSTRAINT_NAME='fk_pedido_sesion_mesa') THEN
  ALTER TABLE pedidos ADD CONSTRAINT fk_pedido_sesion_mesa FOREIGN KEY(sesion_mesa_id) REFERENCES sesiones_mesa(id) ON DELETE RESTRICT ON UPDATE CASCADE;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='jugadores' AND CONSTRAINT_NAME='fk_jugador_sesion_mesa') THEN
  ALTER TABLE jugadores ADD CONSTRAINT fk_jugador_sesion_mesa FOREIGN KEY(sesion_mesa_id) REFERENCES sesiones_mesa(id) ON DELETE RESTRICT ON UPDATE CASCADE;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='jugadores' AND CONSTRAINT_NAME='chk_participante_sesion_identidad') THEN
  ALTER TABLE jugadores ADD CONSTRAINT chk_participante_sesion_identidad CHECK (sesion_mesa_id IS NULL OR
   (tipo_participante IS NOT NULL AND nombre IS NOT NULL AND CHAR_LENGTH(TRIM(nombre))>0 AND
   ((tipo_participante='registrado' AND clientes_id IS NOT NULL) OR (tipo_participante='temporal' AND clientes_id IS NULL))));
 END IF;
END$$
DELIMITER ;
CALL migrar_sesiones_mesa();
DROP PROCEDURE migrar_sesiones_mesa;
