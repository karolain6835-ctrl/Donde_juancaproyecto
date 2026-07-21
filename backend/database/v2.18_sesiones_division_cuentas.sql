-- =============================================================================
-- PROYECTO: Dondejuanca Backend
-- SCRIPT: v2.18_sesiones_division_cuentas.sql
-- DESCRIPCIÓN: Tabla para gestionar la división de cuentas entre clientes.
-- FECHA: 2026-07-21
-- =============================================================================

USE mydb;

CREATE TABLE IF NOT EXISTS divisiones_cuenta (
    id VARCHAR(50) PRIMARY KEY,
    pedido_id VARCHAR(50) NOT NULL,
    tipo_division ENUM('equitativa', 'items', 'total') NOT NULL,
    total_personas INT DEFAULT 1,
    monto_total DECIMAL(10, 2) NOT NULL,
    monto_por_persona DECIMAL(10, 2) DEFAULT 0.00,
    estado ENUM('pendiente', 'completada', 'cancelada') DEFAULT 'pendiente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

SELECT 'v2.18_sesiones_division_cuentas.sql ejecutado correctamente' AS mensaje;