-- Configuraci?n administrativa ?nica; sin efecto sobre totales del sistema.
CREATE TABLE configuracion_negocio (
 id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
 nombreNegocio VARCHAR(150) NULL, nit VARCHAR(30) NULL,
 telefono VARCHAR(30) NULL, email VARCHAR(150) NULL, direccion VARCHAR(255) NULL,
 horaApertura CHAR(5) NULL, horaCierre CHAR(5) NULL,
 impuesto DECIMAL(5,2) NULL, moneda CHAR(3) NOT NULL DEFAULT 'COP',
 actualizado_en DATETIME NULL, actualizado_por VARCHAR(36) NULL,
 CONSTRAINT chk_configuracion_unica CHECK(id=1),
 CONSTRAINT chk_configuracion_impuesto CHECK(impuesto IS NULL OR impuesto BETWEEN 0 AND 100),
 CONSTRAINT chk_configuracion_moneda CHECK(moneda='COP'),
 CONSTRAINT fk_configuracion_usuario FOREIGN KEY(actualizado_por) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
INSERT INTO configuracion_negocio(id) VALUES(1);
