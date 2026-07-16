-- ====================================================================
-- Inserción de Datos Maestros de Configuración Inicial
-- v2.6 - 16 de Julio de 2026
-- ====================================================================

USE `mydb`;

-- 1. Registro del Estado
SELECT 'Insertando Datos Maestros del Sistema en mydb...' AS Estado;

-- 2. DATOS MAESTROS: Roles de Seguridad
-- Permite definir los niveles de acceso antes de registrar usuarios
INSERT INTO `roles` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Administrador', 'Acceso total al sistema, reportes financieros e inventarios.'),
(2, 'Mesero', 'Registro de pedidos, control de mesas y atención al cliente.')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `descripcion` = VALUES(`descripcion`);

-- 3. DATOS MAESTROS: Tipos de Juegos / Canchas
-- Configuración básica de las actividades disponibles en el establecimiento
INSERT INTO `activos_juego` (`id`, `nombre`, `tarifa_hora`, `estado`) VALUES
('act-001', 'Cancha de Tejo Profesional 1', 15000.00, 'disponible'),
('act-002', 'Cancha de Tejo Profesional 2', 15000.00, 'disponible'),
('act-003', 'Mesa de Billar Pool 1', 12000.00, 'disponible'),
('act-004', 'Mesa de Billar Libre 1', 10000.00, 'disponible')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `tarifa_hora` = VALUES(`tarifa_hora`);

-- 4. DATOS MAESTROS: Categorías de Inventario (Opcional según tu diseño de tabla productos)
-- Registramos algunos productos iniciales como base de datos de consulta
INSERT INTO `productos` (`id`, `nombre`, `precio`, `stock`, `stock_minimo`) VALUES
('PROD-001', 'Cerveza Club Colombia', 5000.00, 48, 12),
('PROD-002', 'Aguardiente Antioqueño 750ml', 80000.00, 12, 3),
('PROD-003', 'Gaseosa Coca-Cola 350ml', 3500.00, 60, 10),
('PROD-004', 'Porción de Chicharrón', 15000.00, 20, 5)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `precio` = VALUES(`precio`), `stock` = VALUES(`stock`);

-- 5. Confirmación de finalización
SELECT '¡Datos Maestros cargados con éxito!' AS Resultado;