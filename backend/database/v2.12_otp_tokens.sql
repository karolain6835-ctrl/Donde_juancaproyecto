-- v2.12_otp_tokens.sql
-- Aseguramos la existencia de la tabla otp_tokens con campos de expiración y estado de uso

CREATE TABLE IF NOT EXISTS `mydb`.`otp_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(8) NOT NULL,
  `expira_en` DATETIME NOT NULL,
  `usado` TINYINT DEFAULT 0,
  `creado_en` DATETIME NOT NULL,
  `usuarios_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_otp_tokens_usuarios1_idx` (`usuarios_id` ASC),
  CONSTRAINT `fk_otp_tokens_usuarios1`
    FOREIGN KEY (`usuarios_id`)
    REFERENCES `mydb`.`usuarios` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE = InnoDB;