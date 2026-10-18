-- Opcional y sin backfill: productos existentes conservan NULL.
ALTER TABLE productos
 ADD COLUMN imagen_url VARCHAR(180) NULL DEFAULT NULL,
 ADD UNIQUE KEY uq_producto_imagen (imagen_url);
