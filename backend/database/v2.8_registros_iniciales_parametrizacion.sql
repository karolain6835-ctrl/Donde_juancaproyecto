-- ====================================================================
-- Sección 3.5.1.2: Definición de Registros Iniciales de Parametrización
-- v2.8 - 16 de Julio de 2026
-- ====================================================================

USE `mydb`;

-- 1. Registro del Estado de la Migración
SELECT 'Insertando registros iniciales de parametrización (Estados, Tipos y Configuraciones)' AS Estado;

-- 2. CONFIGURACIONES: Roles de Usuario (Configuración inicial de acceso)
INSERT INTO `roles` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Administrador', 'Acceso total al sistema, reportes financieros e inventarios.'),
(2, 'Mesero', 'Registro de pedidos, control de mesas y atención al cliente.')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `descripcion` = VALUES(`descripcion`);

-- 3. TIPOS Y ESTADOS: Activos de Juego (Alineado con columnas de la base de datos física)
-- Columnas mapeadas: id (varchar), nombre (varchar), estado (enum), tipo (enum), precio_hora (decimal)
INSERT INTO `activos_juego` (`id`, `nombre`, `estado`, `tipo`, `precio_hora`) VALUES
('act-001', 'Cancha de Tejo Profesional 1', 'disponible', 'tejo', 15000.00),
('act-002', 'Cancha de Tejo Profesional 2', 'disponible', 'tejo', 15000.00),
('act-003', 'Mesa de Billar Pool 1', 'disponible', 'billar', 12000.00),
('act-004', 'Mesa de Billar Libre 1', 'disponible', 'billar', 10000.00)
ON DUPLICATE KEY UPDATE 
  `nombre` = VALUES(`nombre`), 
  `estado` = VALUES(`estado`), 
  `tipo` = VALUES(`tipo`), 
  `precio_hora` = VALUES(`precio_hora`);

-- 4. Confirmación de finalización exitosa
SELECT '¡Registros iniciales de la sección 3.5.1.2 cargados con éxito!' AS Resultado;