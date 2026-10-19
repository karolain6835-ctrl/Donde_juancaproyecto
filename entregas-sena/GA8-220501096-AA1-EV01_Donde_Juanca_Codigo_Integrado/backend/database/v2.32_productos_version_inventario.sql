ALTER TABLE productos ADD COLUMN version_inventario BIGINT UNSIGNED NOT NULL DEFAULT 0;
DELIMITER $$
CREATE TRIGGER trg_productos_version_inventario BEFORE UPDATE ON productos
FOR EACH ROW
BEGIN
 IF NOT (NEW.cantidad_disponible <=> OLD.cantidad_disponible)
    OR NOT (NEW.costo_promedio_ponderado <=> OLD.costo_promedio_ponderado) THEN
   IF OLD.version_inventario = 18446744073709551615 THEN
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Version de inventario agotada';
   END IF;
   SET NEW.version_inventario = OLD.version_inventario + 1;
 ELSE
   SET NEW.version_inventario = OLD.version_inventario;
 END IF;
END$$
DELIMITER ;
