-- =============================================================================
-- PROYECTO: Dondejuanca Backend
-- SCRIPT: v2.17_tablero_kanban_cocina.sql
-- DESCRIPCIÓN: Vista y consulta optimizada para el tablero Kanban de cocina/barra,
--              agrupando ítems de pedidos abiertos por su estado de preparación.
-- FECHA: 2026-07-21
-- =============================================================================

USE mydb;

-- 1. Creación de vista optimizada para la consulta del Kanban
CREATE OR REPLACE VIEW vista_kanban_cocina AS
SELECT 
    pi.id AS item_id,
    pi.cantidad_pedida,
    pi.estado AS estado_item,
    p.nombre AS producto_nombre,
    ped.id AS pedido_id,
    m.numero AS numero_mesa,
    ped.creado_en
FROM pedido_items pi
JOIN productos p ON (pi.producto_id = p.id OR pi.productos_id = p.id)
JOIN pedidos ped ON (pi.pedido_id = ped.id OR pi.pedidos_id = ped.id)
JOIN mesas m ON ped.mesas_id = m.id
WHERE pi.estado IN ('enviado', 'preparacion', 'preparando', 'servido')
  AND ped.estado = 'abierto'
ORDER BY ped.creado_en ASC;

-- 2. Confirmación de ejecución
SELECT 'v2.17_tablero_kanban_cocina.sql ejecutado correctamente' AS mensaje;