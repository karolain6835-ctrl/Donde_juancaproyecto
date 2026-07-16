-- Módulo de Cierre de Cuentas y Pagos - API
USE `mydb`;

-- ====================================================================
-- Módulo de Cierre de Cuentas y Pagos - API
-- v2.0 - 15 de Julio de 2026
-- ====================================================================

-- 1. Eliminar la restricción UNIQUE de la columna estado en la tabla pagos
-- Explicación: El estado del pago (pendiente/aprobado) se repite en múltiples transacciones
ALTER TABLE `mydb`.`pagos` DROP INDEX `estado_UNIQUE`;

-- 2. Registro semilla de datos base para simular la prueba de flujo de caja
INSERT IGNORE INTO mesas (id, numero, estado, creado_en) 
VALUES ('mesa-005', 5, 'disponible', NOW());

INSERT IGNORE INTO clientes (id, nombre, estado, usuarios_id) 
VALUES ('cli-001', 'Cliente de Prueba', 'activo', 'user-001');

INSERT IGNORE INTO pedidos (id, estado, creado_en, mesas_id, usuarios_id, clientes_id) 
VALUES ('ped-001', 'abierto', NOW(), 'mesa-005', 'user-001', 'cli-001');