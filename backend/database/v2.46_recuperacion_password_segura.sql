-- Recuperación post-V1. No reutilizar ni modificar otp_tokens legado.
CREATE TABLE recuperaciones_password (
 id VARCHAR(36) NOT NULL PRIMARY KEY,
 usuarios_id VARCHAR(36) NOT NULL,
 otp_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 credencial_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 otp_expira_en DATETIME(6) NOT NULL,
 intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
 otp_usado TINYINT(1) NOT NULL DEFAULT 0,
 enviado TINYINT(1) NOT NULL DEFAULT 0,
 token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 token_expira_en DATETIME(6) NULL,
 consumido TINYINT(1) NOT NULL DEFAULT 0,
 creado_en DATETIME(6) NOT NULL,
 UNIQUE KEY uq_recuperacion_token (token_hash),
 KEY idx_recuperacion_usuario (usuarios_id,consumido,creado_en),
 CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (usuarios_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT chk_recuperacion_intentos CHECK (intentos<=5),
 CONSTRAINT chk_recuperacion_token CHECK ((token_hash IS NULL AND token_expira_en IS NULL) OR (token_hash IS NOT NULL AND token_expira_en IS NOT NULL AND otp_usado=1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
