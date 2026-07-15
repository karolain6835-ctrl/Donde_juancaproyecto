-- ========================================================== 📦
-- MIGRACIÓN V1.9: Gestión de API para Mesas y Productos
-- ========================================================== 
USE `mydb`;

-- 1. Inserción de Categorías Base (Si no existen)
INSERT IGNORE INTO categorias (id, nombre, descripcion, activo) VALUES 
(1, 'Cervezas', 'Cervezas en botella y lata', 1),
(2, 'Licores', 'Botellas y medias', 1),
(3, 'Bebidas sin alcohol', 'Gaseosas, aguas y energizantes', 1),
(4, 'Snacks de Tienda', 'Paquetes, maní y gomas', 1),
(5, 'Artículos Varios', 'Cigarrillos y encendedores', 1);

-- 2. Inserción de Proveedor Base (Ejemplo)
-- Nota: Asegúrate de que los campos coincidan con tu tabla real
INSERT IGNORE INTO proveedores (id, contacto_nombre, telefono, estado) 
VALUES ('prov-001', 'Distribuidora Central', '3001234567', 1);

-- 3. Inserción de Historial de Costos Base (Ejemplo)
INSERT IGNORE INTO historial_costos (id, costo_unitario, fecha_actualizacion) 
VALUES ('hist-001', 3000, NOW());

-- 4. Inserción de Mesa de prueba
INSERT IGNORE INTO mesas (id, numero, estado, creado_en) 
VALUES ('c1a2b3c4-d5e6-7890-1234-56789abcdef0', 1, 'disponible', NOW());

-- Datos semilla necesarios para habilitar la prueba del API de Productos
INSERT IGNORE INTO roles (id, nombre, descripcion, activo) 
VALUES (1, 'Administrador', 'Control total del sistema', 1);

INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, estado, intentos_fallidos, roles_id) 
VALUES ('user-001', 'Juanca', 'juanca@dondejuanca.com', 'hash_seguro_xyz', 'activo', 0, 1);

INSERT IGNORE INTO compras (id, estado, total_estimado, total_recibido, creado_en, proveedores_id, usuarios_id) 
VALUES ('compra-001', 'recibida', 3000.00, 3000.00, NOW(), 'prov-001', 'user-001');

INSERT IGNORE INTO historial_costos (id, costo_unitario, costo_promedio_ponderado, creado_en, compras_id) 
VALUES ('hist-001', 3000.00, 3000.00, NOW(), 'compra-001');