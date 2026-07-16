USE `mydb`;

-- ====================================================================
-- Módulo de Gestión de Juegos (Tejo / Billar) - API
-- v2.1 - 15 de Julio de 2026
-- ====================================================================

-- Crear la tabla juegos si no existe, respetando las columnas del backend
CREATE TABLE IF NOT EXISTS `mydb`.`juegos` (
  `id` VARCHAR(20) NOT NULL,
  `tipo_juego` ENUM('billar', 'tejo') NOT NULL,
  `horas_jugadas` DECIMAL(5,2) DEFAULT 0.00,
  `tarifa_por_hora` DECIMAL(10,2) NOT NULL,
  `estado` ENUM('en_progreso', 'terminado') DEFAULT 'en_progreso',
  `creado_en` DATETIME NOT NULL,
  `mesas_id` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_juegos_mesas`
    FOREIGN KEY (`mesas_id`)
    REFERENCES `mydb`.`mesas` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

USE `mydb`;

-- ====================================================================
-- Módulo de Gestión de Juegos (Tejo / Billar) - API
-- v2.1 - 15 de Julio de 2026
-- ====================================================================

-- Nota de arquitectura: Se utiliza la estructura nativa del diagrama.
-- La lógica apunta a 'sesiones_juego' en lugar de una tabla 'juegos' genérica.
SELECT 'Módulo sincronizado con el modelo relacional original' AS Estado;
USE `mydb`;

-- ====================================================================
-- Módulo de Gestión de Juegos (Tejo / Billar) - API
-- v2.1 - 15 de Julio de 2026
-- ====================================================================

-- 1. Eliminación de tabla redundante creada por error de diseño inicial
DROP TABLE IF EXISTS `mydb`.`juegos`;

-- 2. Nota de arquitectura: La lógica de control de tiempo y tarifas
-- se integrará directamente utilizando la estructura original de 'sesiones_juego'.
SELECT 'Esquema limpio y sincronizado con el modelo de datos original' AS Estado;