-- =============================================================================
-- PROYECTO: Dondejuanca Backend
-- SCRIPT: v2.19_division_items_detalle.sql
-- DESCRIPCIÓN: Estructura para registrar los comensales/clientes dentro de una 
--              sesión de división y la asignación detallada de ítems a pagar.
-- FECHA: 2026-10-06
-- =============================================================================

USE mydb;

-- 1. Tabla de participantes/comensales en la sesión de división
CREATE TABLE IF NOT EXISTS division_participantes (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    sesion_division_id VARCHAR(36) NOT NULL,
    nombre_cliente VARCHAR(100) NOT NULL,
    total_asignado DECIMAL(10,2) DEFAULT 0.00,
    estado ENUM('pendiente', 'pagado') DEFAULT 'pendiente',
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_part_sesion (sesion_division_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabla de detalle de ítems asignados por comensal
CREATE TABLE IF NOT EXISTS division_items_detalle (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    participante_id VARCHAR(36) NOT NULL,
    pedido_item_id VARCHAR(36) NOT NULL,
    cantidad_asignada INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_det_participante (participante_id),
    KEY idx_det_pedido_item (pedido_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'v2.19_division_items_detalle.sql ejecutado correctamente' AS mensaje;