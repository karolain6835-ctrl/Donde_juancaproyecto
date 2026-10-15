-- No inferir visitas ni identidades para datos históricos.
ALTER TABLE sesiones_division_cuentas
 ADD COLUMN sesion_mesa_id VARCHAR(36) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
 ADD KEY idx_division_visita (sesion_mesa_id),
 ADD CONSTRAINT fk_division_visita FOREIGN KEY (sesion_mesa_id) REFERENCES sesiones_mesa(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE division_participantes
 ADD COLUMN jugadores_id VARCHAR(36) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
 ADD COLUMN idempotencia_clave VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
 ADD COLUMN solicitud_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL,
 ADD KEY idx_division_pagador (jugadores_id),
 ADD UNIQUE KEY uq_division_asignacion_clave (sesion_division_id,idempotencia_clave),
 ADD CONSTRAINT fk_division_pagador FOREIGN KEY (jugadores_id) REFERENCES jugadores(id) ON DELETE RESTRICT ON UPDATE CASCADE;
