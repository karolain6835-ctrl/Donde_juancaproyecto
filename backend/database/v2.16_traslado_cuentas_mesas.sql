-- =============================================================================
-- PROYECTO: Dondejuanca Backend
-- SCRIPT: v2.16_traslado_cuentas_mesas.sql
-- DESCRIPCIÓN: Script y procedimiento almacenado para la gestión del traslado
--              de cuentas y pedidos abiertos entre mesas.
-- FECHA: 2026-07-21
-- =============================================================================

USE mydb;

-- 1. Índice para optimizar búsquedas por mesa y estado
CREATE INDEX IF NOT EXISTS idx_pedidos_mesa_estado ON pedidos (mesas_id, estado);

-- 2. Procedimiento Almacenado para Traslado Seguro de Mesas
DELIMITER //

DROP PROCEDURE IF EXISTS sp_trasladar_mesa //

CREATE PROCEDURE sp_trasladar_mesa(
    IN p_mesa_origen_id VARCHAR(50),
    IN p_mesa_destino_id VARCHAR(50),
    OUT p_pedidos_movidos INT
)
BEGIN
    DECLARE v_error INT DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_error = 1;

    START TRANSACTION;

    -- Contar cuántos pedidos abiertos hay en la mesa origen
    SELECT COUNT(*) INTO p_pedidos_movidos 
    FROM pedidos 
    WHERE mesas_id = p_mesa_origen_id AND estado = 'abierto';

    -- Si existen pedidos abiertos, trasladar y actualizar estados
    IF p_pedidos_movidos > 0 THEN
        -- Mover pedidos abiertos a la mesa destino
        UPDATE pedidos 
        SET mesas_id = p_mesa_destino_id 
        WHERE mesas_id = p_mesa_origen_id AND estado = 'abierto';

        -- Liberar mesa origen
        UPDATE mesas 
        SET estado = 'disponible' 
        WHERE id = p_mesa_origen_id;

        -- Ocupar mesa destino
        UPDATE mesas 
        SET estado = 'ocupada' 
        WHERE id = p_mesa_destino_id;
    END IF;

    -- Confirmación o reversión de transacción
    IF v_error = 1 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error en la transacción SQL al trasladar la mesa.';
    ELSE
        COMMIT;
    END IF;

END //

DELIMITER ;

SELECT 'v2.16_traslado_cuentas_mesas.sql ejecutado correctamente' AS mensaje;