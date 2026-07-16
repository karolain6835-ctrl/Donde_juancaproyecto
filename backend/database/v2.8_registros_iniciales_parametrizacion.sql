-- ====================================================================
-- Sección 3.5.1.2: Definición de Registros Iniciales de Parametrización
-- v2.8 - 16 de Julio de 2026
-- ====================================================================

USE `mydb`;

-- 1. Registro del Estado de la Migración
SELECT 'Insertando registros iniciales de parametrización (Estados, Tipos, Clasificaciones y Configuraciones)' AS Estado;

-- 2. CONFIGURACIONES: Roles de Usuario (Configuración inicial de acceso)
INSERT INTO `roles` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Administrador', 'Acceso total al sistema, reportes financieros e inventarios.'),
(2, 'Mesero', 'Registro de pedidos, control de mesas y atención al cliente.')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `descripcion` = VALUES(`descripcion`);

-- 3. TIPOS: Tipos de Activos / Canchas y Mesas
-- Registros base de tarifas y tipos de juego
INSERT INTO `activos_juego` (`id`, `nombre`, `tarifa_hora`, `estado`) VALUES
('act-001', 'Cancha de Tejo Profesional 1', 15000.00, 'disponible'),
('act-002', 'Cancha de Tejo Profesional 2', 15000.00, 'disponible'),
('act-003', 'Mesa de Billar Pool 1', 12000.00, 'disponible'),
('act-004', 'Mesa de Billar Libre 1', 10000.00, 'disponible')
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `tarifa_hora` = VALUES(`tarifa_hora`), `estado` = VALUES(`estado`);

-- 4. CLASIFICACIONES: Categorías de Productos Iniciales (Para alertas e inventario)
INSERT INTO `productos` (`id`, `nombre`, `precio`, `stock`, `stock_minimo`) VALUES
('PROD-001', 'Cerveza Club Colombia', 5000.00, 48, 12),
('PROD-002', 'Aguardiente Antioqueño 750ml', 80000.00, 12, 3),
('PROD-003', 'Gaseosa Coca-Cola 350ml', 3500.00, 60, 10),
('PROD-004', 'Porción de Chicharrón', 15000.00, 20, 5)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `precio` = VALUES(`precio`), `stock` = VALUES(`stock`), `stock_minimo` = VALUES(`stock_minimo`);

-- 5. Confirmación de finalización exitosa
SELECT '¡Registros iniciales de la sección 3.5.1.2 cargados con éxito!' AS Resultado;