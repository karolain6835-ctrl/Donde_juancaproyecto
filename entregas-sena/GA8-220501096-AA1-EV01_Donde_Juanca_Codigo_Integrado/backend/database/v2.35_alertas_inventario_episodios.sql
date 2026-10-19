-- MariaDB 10.4.32. Seleccionar el esquema antes de ejecutar.
-- No reinterpreta alertas existentes: quedan en modelo legado con campos nuevos NULL.
ALTER TABLE alertas_inventario
 ADD COLUMN modelo_episodio ENUM('legado','v2') NOT NULL DEFAULT 'legado',
 ADD COLUMN stock_observado INT NULL DEFAULT NULL,
 ADD COLUMN stock_minimo INT NULL DEFAULT NULL,
 ADD COLUMN actualizado_en DATETIME NULL DEFAULT NULL,
 ADD COLUMN resuelto_en DATETIME NULL DEFAULT NULL,
 ADD COLUMN vista_por VARCHAR(36) NULL DEFAULT NULL,
 ADD COLUMN silenciada_por VARCHAR(36) NULL DEFAULT NULL,
 ADD COLUMN resuelta_por VARCHAR(36) NULL DEFAULT NULL,
 ADD COLUMN producto_abierto VARCHAR(36) GENERATED ALWAYS AS
 (CASE WHEN modelo_episodio='v2' AND estado<>'resuelta' THEN productos_id ELSE NULL END) PERSISTENT,
 ADD UNIQUE KEY uq_alerta_producto_abierto (producto_abierto),
 ADD KEY idx_alertas_estado_fecha (modelo_episodio,estado,creado_en,id),
 ADD KEY idx_alertas_producto_fecha (productos_id,creado_en,id),
 ADD CONSTRAINT fk_alerta_vista_usuario FOREIGN KEY (vista_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD CONSTRAINT fk_alerta_silencio_usuario FOREIGN KEY (silenciada_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD CONSTRAINT fk_alerta_resolucion_usuario FOREIGN KEY (resuelta_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD CONSTRAINT chk_alerta_episodio_v2 CHECK (modelo_episodio='legado' OR
 (stock_observado IS NOT NULL AND stock_minimo IS NOT NULL AND actualizado_en IS NOT NULL
 AND ((estado='resuelta' AND resuelto_en IS NOT NULL) OR (estado<>'resuelta' AND resuelto_en IS NULL))));
CREATE TABLE alertas_inventario_historial (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 secuencia BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 UNIQUE KEY uq_alerta_historial_secuencia (secuencia),
 alertas_inventario_id VARCHAR(36) NOT NULL,
 evento ENUM('alerta_creada','alerta_vista','alerta_silenciada','alerta_reactivada','alerta_resuelta_automaticamente','alerta_resuelta_manualmente','cambio_condicion','stock_observado') NOT NULL,
 origen ENUM('automatico','humano') NOT NULL,
 usuarios_id VARCHAR(36) NULL,
 cambios_json LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK(JSON_VALID(cambios_json)),
 creado_en DATETIME NOT NULL,
 KEY idx_alerta_historial_fecha (alertas_inventario_id,secuencia),
 CONSTRAINT fk_alerta_historial_episodio FOREIGN KEY(alertas_inventario_id) REFERENCES alertas_inventario(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT fk_alerta_historial_usuario FOREIGN KEY(usuarios_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT chk_alerta_historial_actor CHECK ((origen='automatico' AND usuarios_id IS NULL) OR (origen='humano' AND usuarios_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
DELIMITER $$
CREATE PROCEDURE sincronizar_alerta_inventario(IN p_producto VARCHAR(36),IN p_stock INT,IN p_minimo INT)
BEGIN
 DECLARE v_id VARCHAR(36) DEFAULT NULL;
 DECLARE v_tipo VARCHAR(10);
 DECLARE v_estado VARCHAR(12);
 DECLARE v_stock INT;
 DECLARE v_minimo INT;
 DECLARE v_nuevo_tipo VARCHAR(10);
 DECLARE v_evento VARCHAR(45);
 DECLARE v_fecha DATETIME;
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_id=NULL;
 SET v_fecha=UTC_TIMESTAMP();
 SELECT id,tipo,estado,stock_observado,stock_minimo INTO v_id,v_tipo,v_estado,v_stock,v_minimo
 FROM alertas_inventario WHERE producto_abierto=p_producto FOR UPDATE;
 IF p_stock<=p_minimo THEN
   SET v_nuevo_tipo=IF(p_stock<=0,'agotado','bajo');
   IF v_id IS NULL THEN
     SET v_id=UUID();
     INSERT INTO alertas_inventario(id,tipo,estado,creado_en,productos_id,modelo_episodio,stock_observado,stock_minimo,actualizado_en)
     VALUES(v_id,v_nuevo_tipo,'activa',v_fecha,p_producto,'v2',p_stock,p_minimo,v_fecha);
     INSERT INTO alertas_inventario_historial(id,alertas_inventario_id,evento,origen,usuarios_id,cambios_json,creado_en)
     VALUES(UUID(),v_id,'alerta_creada','automatico',NULL,JSON_OBJECT('tipo',v_nuevo_tipo,'estado','activa','stock',p_stock,'stock_minimo',p_minimo),v_fecha);
   ELSEIF NOT(v_stock<=>p_stock) OR NOT(v_minimo<=>p_minimo) OR v_tipo<>v_nuevo_tipo THEN
     SET v_evento=IF(v_tipo<>v_nuevo_tipo,'cambio_condicion','stock_observado');
     UPDATE alertas_inventario SET tipo=v_nuevo_tipo,stock_observado=p_stock,stock_minimo=p_minimo,actualizado_en=v_fecha WHERE id=v_id;
     INSERT INTO alertas_inventario_historial(id,alertas_inventario_id,evento,origen,usuarios_id,cambios_json,creado_en)
     VALUES(UUID(),v_id,v_evento,'automatico',NULL,JSON_OBJECT('tipo_anterior',v_tipo,'tipo',v_nuevo_tipo,'estado',v_estado,'stock_anterior',v_stock,'stock',p_stock,'stock_minimo_anterior',v_minimo,'stock_minimo',p_minimo),v_fecha);
   END IF;
 ELSEIF v_id IS NOT NULL THEN
   UPDATE alertas_inventario SET estado='resuelta',stock_observado=p_stock,stock_minimo=p_minimo,actualizado_en=v_fecha,resuelto_en=v_fecha,resuelta_por=NULL WHERE id=v_id;
   INSERT INTO alertas_inventario_historial(id,alertas_inventario_id,evento,origen,usuarios_id,cambios_json,creado_en)
   VALUES(UUID(),v_id,'alerta_resuelta_automaticamente','automatico',NULL,JSON_OBJECT('estado_anterior',v_estado,'estado','resuelta','tipo',v_tipo,'stock_anterior',v_stock,'stock',p_stock,'stock_minimo',p_minimo),v_fecha);
 END IF;
END$$
CREATE TRIGGER trg_producto_alerta_insert AFTER INSERT ON productos
FOR EACH ROW CALL sincronizar_alerta_inventario(NEW.id,NEW.cantidad_disponible,NEW.stock_minimo)$$
CREATE TRIGGER trg_producto_alerta_update AFTER UPDATE ON productos
FOR EACH ROW CALL sincronizar_alerta_inventario(NEW.id,NEW.cantidad_disponible,NEW.stock_minimo)$$
-- Observacion inicial del estado ACTUAL, nunca backfill de episodios historicos.
CREATE PROCEDURE inicializar_alertas_actuales()
BEGIN
 DECLARE terminado INT DEFAULT 0;
 DECLARE v_id VARCHAR(36);
 DECLARE v_stock INT;
 DECLARE v_minimo INT;
 DECLARE cur CURSOR FOR SELECT id,cantidad_disponible,stock_minimo FROM productos ORDER BY id FOR UPDATE;
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET terminado=1;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 OPEN cur;
 bucle: LOOP
   FETCH cur INTO v_id,v_stock,v_minimo;
   IF terminado=1 THEN LEAVE bucle; END IF;
   CALL sincronizar_alerta_inventario(v_id,v_stock,v_minimo);
 END LOOP;
 CLOSE cur;
 COMMIT;
END$$
DELIMITER ;
CALL inicializar_alertas_actuales();
DROP PROCEDURE inicializar_alertas_actuales;
