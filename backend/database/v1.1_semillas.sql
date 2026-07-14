-- Usar la base de datos del proyecto
USE `mydb`;

-- ==========================================
-- 1. SEMILLAS PARA ROLES
-- ==========================================
-- Insertamos los roles básicos. El ID se crea solo porque le pusiste AUTO_INCREMENT.
INSERT INTO `roles` (`nombre`, `descripcion`, `activo`) VALUES 
('Administrador', 'Control total del sistema, reportes, inventario y caja', 1),
('Mesera', 'Atención a mesas, venta de tienda y cobro de juegos', 1);

-- ==========================================
-- 2. SEMILLAS PARA CATEGORÍAS (Ajustado para Bar / Juegos)
-- ==========================================
-- Categorías iniciales para organizar el inventario del tomadero y la tienda.
INSERT INTO `categorias` (`nombre`, `descripcion`, `activo`) VALUES 
('Cervezas', 'Cervezas en botella y lata (Poker, Aguila, Club Colombia, etc.)', 1),
('Licores', 'Botellas y medias de Aguardiente, Ron, Whiskey', 1),
('Bebidas sin alcohol', 'Gaseosas, aguas, hidratantes y energizantes', 1),
('Snacks de Tienda', 'Paquetes, maní, chicharrones, gomas', 1),
('Artículos Varios', 'Cigarrillos, encendedores y otros de tienda', 1);

-- ==========================================
-- 3. SEMILLAS PARA MOTIVOS DE MERMA
-- ==========================================
-- Ajustado a los accidentes más comunes en un bar o cancha de tejo.
INSERT INTO `merma_motivos` (`id`, `nombre`) VALUES 
(UUID(), 'Ruptura de envase (Accidente)'),
(UUID(), 'Vencimiento o caducidad'),
(UUID(), 'Consumo interno / Cortesía'),
(UUID(), 'Defecto de fábrica (Producto dañado desde el proveedor)');