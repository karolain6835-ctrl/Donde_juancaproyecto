-- ============================================================
-- VERSIÓN 2.12: Creación de la tabla otp_tokens
-- Descripción: Tabla para almacenar tokens OTP de recuperación
-- ============================================================

USE mydb;

CREATE TABLE IF NOT EXISTS otp_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(8) NOT NULL,
  expira_en DATETIME NOT NULL,
  usado TINYINT(1) DEFAULT 0,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuarios_id INT NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_otp_tokens_usuarios
    FOREIGN KEY (usuarios_id)
    REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);