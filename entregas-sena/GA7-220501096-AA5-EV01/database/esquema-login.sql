-- DDL extraído de backend/database/v1.0_estructura.sql.
-- Solo cambia el nombre del esquema para aislar la entrega académica.
-- No contiene datos ni crea usuarios de MySQL. Ejecutar solo en un entorno local autorizado.
CREATE DATABASE IF NOT EXISTS `dondejuanca_sena_auth`;
USE `dondejuanca_sena_auth`;

CREATE TABLE IF NOT EXISTS `dondejuanca_sena_auth`.`roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `descripcion` VARCHAR(200) NULL,
  `activo` TINYINT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `nombre_UNIQUE` (`nombre` ASC) VISIBLE)
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `dondejuanca_sena_auth`.`usuarios` (
  `id` VARCHAR(36) NOT NULL,
  `nombre` VARCHAR(100) NULL,
  `email` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `estado` ENUM('activo', 'inactivo', 'bloqueado') NULL,
  `intentos_fallidos` TINYINT NULL,
  `ultimo_acceso` DATETIME NULL,
  `roles_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE,
  INDEX `fk_usuarios_roles_idx` (`roles_id` ASC) VISIBLE,
  CONSTRAINT `fk_usuarios_roles`
    FOREIGN KEY (`roles_id`)
    REFERENCES `dondejuanca_sena_auth`.`roles` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;
