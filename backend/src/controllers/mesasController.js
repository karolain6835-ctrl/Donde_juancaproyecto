const { ejecutor } = require('../services/identidadService');
const { registrarAuditoria } = require('../services/auditoriaService');
const db = require('../config/db');
const mysql = require('mysql2');
const { evaluarLiberacionMesa } = require('../services/liquidacionService');
const { asegurarSesion, cerrarSesion, sesionActiva } = require('../services/sesionesMesaService');

// Obtener mesas filtradas por su estado
const obtenerMesasPorEstado = (req, res) => {
  const { estado } = req.params; 

  const estadosValidos = ['disponible', 'ocupada', 'en_cobro'];
  
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ 
      error: "Estado no válido. Usa 'disponible', 'ocupada' o 'en_cobro'." 
    });
  }

  const query = 'SELECT * FROM mesas WHERE estado = ?';

  db.query(query, [estado], (err, resultados) => {
    if (err) {
      console.error('❌ Error al consultar las mesas:', err.message);
      return res.status(500).json({ 
        error: 'Hubo un error en el servidor al traer las mesas.' 
      });
    }

    res.json({
      mensaje: `¡Mesas en estado '${estado}' cargadas con éxito! 🎲`,
      total: resultados.length,
      datos: resultados
    });
  });
};

// Actualizar el estado de una mesa
const actualizarEstadoMesa = async (req,res) => {
  const actor=ejecutor(req,res);if(!actor)return;
  const {id}=req.params;const {estado}=req.body || {};
  if(!['disponible','ocupada','en_cobro'].includes(estado))return res.status(400).json({error:'Estado no válido. Use: disponible, ocupada o en_cobro.'});
  let conexion,abierta=false;
  try {
    conexion=mysql.createConnection(db.dbConfig).promise();await conexion.beginTransaction();abierta=true;
    const [[mesa]]=await conexion.query('SELECT id,estado FROM mesas WHERE id=? FOR UPDATE',[id]);
    if(!mesa)throw Object.assign(new Error('Mesa no encontrada.'),{status:404});
    if (estado === 'disponible') {
      const disponibilidad = await evaluarLiberacionMesa(conexion, mesa.id);
      if (!disponibilidad.puede_liberarse) throw Object.assign(new Error(disponibilidad.motivo), { status: 409 });
      await cerrarSesion(conexion, mesa.id);
    }
    if (estado !== 'disponible') await asegurarSesion(conexion, mesa.id);
    const [r]=await conexion.query('UPDATE mesas SET estado=? WHERE id=?',[estado,mesa.id]);
    if(r.affectedRows!==1)throw new Error('No se actualizó la mesa.');
    if(mesa.estado!==estado)await registrarAuditoria(conexion,actor,'mesas','mesa_estado_cambiado','mesas',mesa.id,{antes:{estado:mesa.estado},despues:{estado}});
    await conexion.commit();abierta=false;
    res.json({ mensaje: `¡Mesa actualizada a '${estado}' con éxito! 🕹️` });
  } catch(e){
    if(abierta)await conexion.rollback();
    return res.status(e.status||500).json({error:e.status?e.message:'Hubo un error al actualizar el estado de la mesa.'});
  } finally {if(conexion)await conexion.end();}
};

const consultarLiberacionMesa = async (req, res) => {
  let conexion, abierta = false;
  try {
    conexion = mysql.createConnection(db.dbConfig).promise(); await conexion.beginTransaction(); abierta = true;
    const [[mesa]] = await conexion.query('SELECT id,estado FROM mesas WHERE id=? FOR UPDATE', [req.params.id]);
    if (!mesa) throw Object.assign(new Error('Mesa no encontrada.'), { status: 404 });
    let disponibilidad;
    try { disponibilidad = await evaluarLiberacionMesa(conexion, mesa.id); }
    catch (error) { if (error.status !== 409) throw error; disponibilidad = { puede_liberarse: false, motivo: error.message }; }
    await conexion.commit(); abierta = false;
    return res.json({ datos: { ...disponibilidad, mesa_id: mesa.id, estado: mesa.estado } });
  } catch (error) {
    if (abierta) await conexion.rollback();
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo consultar la disponibilidad de la mesa.' });
  } finally { if (conexion) await conexion.end(); }
};

// ==========================================
// TRASLADAR CUENTA Y JUEGOS DE UNA MESA A OTRA
// ==========================================
const trasladarMesa = async (req, res) => {
  const actor=ejecutor(req,res);if(!actor)return;
  const { mesa_origen_id, mesa_destino_id } = req.body || {};
  if (!mesa_origen_id || !mesa_destino_id) {
    return res.status(400).json({ error: "Faltan datos. Se requiere la 'mesa_origen_id' y la 'mesa_destino_id'." });
  }
  if (typeof mesa_origen_id !== 'string' || typeof mesa_destino_id !== 'string') {
    return res.status(400).json({ error: 'Los identificadores de mesa deben ser cadenas.' });
  }
  if (mesa_origen_id.toLowerCase() === mesa_destino_id.toLowerCase()) {
    return res.status(400).json({ error: 'La mesa de origen y la mesa de destino no pueden ser la misma.' });
  }

  let conexion;
  let transaccionIniciada = false;
  let mensajeError = 'Error interno al procesar la solicitud.';
  const rechazar = (status, mensaje) => { throw Object.assign(new Error(mensaje), { status }); };
  try {
    // Conexión exclusiva: otras peticiones no comparten esta transacción.
    conexion = mysql.createConnection(db.dbConfig).promise();
    await conexion.beginTransaction();
    transaccionIniciada = true;
    // Orden estable para serializar traslados concurrentes de las mismas mesas.
    const [mesas] = await conexion.query(
      'SELECT id, estado FROM mesas WHERE id IN (?, ?) ORDER BY id FOR UPDATE',
      [mesa_origen_id, mesa_destino_id]
    );
    if (mesas.length !== 2) rechazar(404, 'La mesa de origen o de destino no existe.');
    const origen = mesas.find(m => m.id.toLowerCase() === mesa_origen_id.toLowerCase());
    const destino = mesas.find(m => m.id.toLowerCase() === mesa_destino_id.toLowerCase());
    if (!origen || !destino) rechazar(404, 'La mesa de origen o de destino no existe.');

    mensajeError = 'Error al verificar disponibilidad de la mesa destino.';
    const [ocupacion] = await conexion.query(`
      SELECT id FROM pedidos WHERE mesas_id = ? AND estado = 'abierto'
      UNION ALL
      SELECT id FROM sesiones_juego WHERE mesas_id = ? AND estado = 'activa'
      UNION ALL
      SELECT id FROM sesiones_division_cuentas WHERE mesas_id = ? AND estado = 'activa'

    `, [destino.id, destino.id, destino.id]);
    if (destino.estado !== 'disponible' || ocupacion.length) {
      rechazar(400, 'La mesa de destino ya se encuentra ocupada con una cuenta activa.');
    }
    const liberacionDestino = await evaluarLiberacionMesa(conexion, destino.id);
    if (!liberacionDestino.puede_liberarse) rechazar(409, liberacionDestino.motivo);
    if (await sesionActiva(conexion, destino.id)) rechazar(409, 'La mesa de destino tiene una visita activa.');
    const visitaOrigen = await sesionActiva(conexion, origen.id);

    // También mover juegos cerrados cuyo consumo pertenece a pedidos aún abiertos.
    const juegosDeCuenta = `
      sj.mesas_id = ? AND (sj.estado = 'activa' OR
        (sj.estado = 'cerrada' AND EXISTS (
          SELECT 1 FROM pedido_items pi
          JOIN pedidos ped ON (pi.pedido_id = ped.id OR pi.pedidos_id = ped.id)
          WHERE pi.id = sj.pedido_items_id AND ped.mesas_id = ? AND ped.estado = 'abierto'
        )))
    `;
    mensajeError = 'Error al trasladar las sesiones de juego.';
    // Jugadores tienen referencia propia a mesa; rondas e ítems mantienen sus IDs.
    await conexion.query(`
      UPDATE jugadores j
      JOIN ronda_jugadores rj ON rj.jugadores_id = j.id
      JOIN rondas r ON r.id = rj.rondas_id
      JOIN sesiones_juego sj ON sj.id = r.sesiones_juego_id
      SET j.mesas_id = ?
      WHERE j.mesas_id = ? AND (${juegosDeCuenta})
    `, [destino.id, origen.id, origen.id, origen.id]);
    const [resJuegos] = await conexion.query(`
      UPDATE sesiones_juego sj SET sj.mesas_id = ? WHERE ${juegosDeCuenta}
    `, [destino.id, origen.id, origen.id]);

    mensajeError = 'Error al trasladar los pedidos a la nueva mesa.';
    await conexion.query(`UPDATE jugadores j JOIN pedidos p ON p.id=j.pedido_id
      SET j.mesas_id=? WHERE p.mesas_id=? AND p.estado='abierto'`, [destino.id, origen.id]);
    const [resPedido] = await conexion.query(`
      UPDATE pedidos SET mesas_id = ? WHERE mesas_id = ? AND estado = 'abierto'
    `, [destino.id, origen.id]);

    // Mover solo divisiones operativas; las finalizadas conservan su mesa histórica.
    mensajeError = 'Error al trasladar las sesiones de división.';
    const [resDivision] = await conexion.query(
      "UPDATE sesiones_division_cuentas SET mesas_id = ? WHERE mesas_id = ? AND estado='activa'", [destino.id, origen.id]
    );
    const resDivisionOriginal = { affectedRows: 0 }; // Tabla original: historial sin ciclo operativo.
    if (!resPedido.affectedRows && !resJuegos.affectedRows &&
        !resDivision.affectedRows && !resDivisionOriginal.affectedRows) {
      rechazar(404, 'La mesa de origen no tiene ningún pedido ni juego activo para trasladar.');
    }

    mensajeError = 'Error al actualizar los estados de las mesas.';
    const liberacionOrigen = await evaluarLiberacionMesa(conexion, origen.id);
    if (!liberacionOrigen.puede_liberarse) rechazar(409, liberacionOrigen.motivo);
    const estadoDestino = origen.estado === 'en_cobro' ? 'en_cobro' : 'ocupada';
    if (visitaOrigen) {
      await conexion.query('UPDATE sesiones_mesa SET mesas_id=? WHERE id=?', [destino.id, visitaOrigen.id]);
      await conexion.query('UPDATE jugadores SET mesas_id=? WHERE sesion_mesa_id=?', [destino.id, visitaOrigen.id]);
    } else await asegurarSesion(conexion, destino.id);
    const [resEstadoOrigen] = await conexion.query(
      "UPDATE mesas SET estado = 'disponible' WHERE id = ?", [origen.id]
    );
    const [resEstadoDestino] = await conexion.query(
      'UPDATE mesas SET estado = ? WHERE id = ?', [estadoDestino, destino.id]
    );
    if (resEstadoOrigen.affectedRows !== 1 || resEstadoDestino.affectedRows !== 1) {
      throw new Error('No se actualizó exactamente una fila por mesa durante el traslado.');
    }
    // Verificar el estado real en la misma transacción antes de confirmar el traslado.
    const [estadosFinales] = await conexion.query(
      'SELECT id, estado FROM mesas WHERE id IN (?, ?) FOR UPDATE', [origen.id, destino.id]
    );
    if (estadosFinales.find(m => m.id === origen.id)?.estado !== 'disponible' ||
        estadosFinales.find(m => m.id === destino.id)?.estado !== estadoDestino) {
      throw new Error('Los estados de las mesas no coinciden con el resultado esperado del traslado.');
    }

    await registrarAuditoria(conexion,actor,'mesas','mesa_trasladada','mesas',origen.id,{
      mesa_origen_id:origen.id,mesa_destino_id:destino.id,
      antes:{origen:origen.estado,destino:destino.estado},despues:{origen:'disponible',destino:estadoDestino},
      pedidos_movidos:resPedido.affectedRows,juegos_movidos:resJuegos.affectedRows,
      divisiones_movidas:resDivision.affectedRows,divisiones_originales_movidas:resDivisionOriginal.affectedRows
    });
    mensajeError = 'Error al finalizar el traslado.';
    await conexion.commit();
    transaccionIniciada = false;
    return res.status(200).json({
      exito: true,
      mensaje: `¡Cuenta trasladada con éxito de la mesa ${mesa_origen_id} a la mesa ${mesa_destino_id}! 🔀`,
      pedidos_movidos: resPedido.affectedRows,
      juegos_movidos: resJuegos.affectedRows
    });
  } catch (error) {
    if (transaccionIniciada) {
      try { await conexion.rollback(); }
      catch (errorRollback) { console.error('Error al revertir traslado:', errorRollback.message); }
    }
    console.error('Error al trasladar mesa:', error.message);
    return res.status(error.status || 500).json({ error: error.status ? error.message : mensajeError });
  } finally {
    if (conexion) {
      try { await conexion.end(); }
      catch (errorConexion) { console.error('Error al cerrar conexión de traslado:', errorConexion.message); }
    }
  }
};

module.exports = {
  consultarLiberacionMesa,
  obtenerMesasPorEstado,
  actualizarEstadoMesa,
  trasladarMesa
};
