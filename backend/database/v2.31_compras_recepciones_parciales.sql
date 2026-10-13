ALTER TABLE compras
 MODIFY COLUMN estado ENUM('pendiente','parcialmente_recibida','recibida','cancelada','cerrada_parcial') NOT NULL,
 ADD COLUMN modelo_recepcion ENUM('legado','v2') NOT NULL DEFAULT 'legado',
 ADD INDEX idx_compras_fecha_id (creado_en,id);
ALTER TABLE compra_items
 ADD COLUMN cantidad_cancelada INT NULL DEFAULT NULL,
 ADD CONSTRAINT chk_compra_items_cancelada CHECK (cantidad_cancelada IS NULL OR (cantidad_cancelada >= 0 AND cantidad_cancelada <= cantidad));
