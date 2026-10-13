const { ejecutor } = require('../services/identidadService');
const db = require('../config/db');
const mysql = require('mysql2');
const crypto = require('crypto');
const { bloquearPedido, calcularCuenta, validarImporte, actualizarLiquidacion,
  validarParticipante, errorLiquidacion, centavos } = require('../services/liquidacionService');

// ==========================================
// REGISTRAR PAGO
// ==========================================
exports.registrarPago = async (req, res) => {
  const usuarios_id = ejecutor(req, res);
  if (!usuarios_id) return;
  const {
    id,
    metodo_de_pago,
    total_seleccionado,
    pedidos_id,
    sesion_division_id,
    participante_id
  } = req.body || {};

  // ==========================================
  // VALIDACIONES BÁSICAS
  // ==========================================

  if (!metodo_de_pago || !pedidos_id || !usuarios_id) {
    return res.status(400).json({
      error:
        'Faltan campos obligatorios (metodo_de_pago, pedidos_id).'
    });
  }

  if (
    total_seleccionado === undefined ||
    total_seleccionado === null ||
    total_seleccionado === ''
  ) {
    return res.status(400).json({
      error: 'total_seleccionado es obligatorio.'
    });
  }

  // Validar antes de convertir: no aceptar coerciones, exponentes ni redondeos.
  const textoImporte = String(total_seleccionado);
  if (!['number', 'string'].includes(typeof total_seleccionado) ||
      !/^\d{1,10}(\.\d{1,2})?$/.test(textoImporte)) {
    return res.status(400).json({
      error: 'total_seleccionado debe ser decimal positivo con hasta dos decimales, sin notación exponencial.'
    });
  }

  const importeCentavos = centavos(textoImporte);
  if (importeCentavos <= 0n || importeCentavos > 999999999999n) {
    return res.status(400).json({
      error: 'total_seleccionado debe ser mayor que cero y no superar 9999999999.99.'
    });
  }
  const importe = `${importeCentavos / 100n}.${String(importeCentavos % 100n).padStart(2, '0')}`;

  const metodosPermitidos = [
    'efectivo',
    'nequi',
    'daviplata',
    'tarjeta'
  ];

  if (!metodosPermitidos.includes(metodo_de_pago)) {
    return res.status(400).json({
      error:
        'metodo_de_pago debe ser efectivo, nequi, daviplata o tarjeta.'
    });
  }

  if (participante_id && !sesion_division_id) {
    return res.status(400).json({
      error: 'participante_id requiere sesion_division_id.'
    });
  }

  // ==========================================
  // GENERAR ID DEL PAGO
  // ==========================================

  const idPago = id || `pago-${crypto.randomBytes(7).toString('hex')}`;

  if (typeof idPago !== 'string' || idPago.length > 20) {
    return res.status(400).json({
      error: 'id debe ser una cadena de hasta 20 caracteres.'
    });
  }

  let conexion;
  let transaccionIniciada = false;

  try {
    // ==========================================
    // CONEXIÓN INDEPENDIENTE PARA TRANSACCIÓN
    // ==========================================

 conexion = mysql.createConnection(db.dbConfig).promise();

    await conexion.beginTransaction();
    transaccionIniciada = true;

    // ==========================================
    // VALIDAR PEDIDO
    // ==========================================

    const pedido = await bloquearPedido(conexion, pedidos_id);
    if (pedido.estado !== 'abierto') throw errorLiquidacion(409, 'El pedido no está abierto.');
    const cuenta = await calcularCuenta(conexion, pedido);
    if (cuenta.pagos.some(p => p.id === idPago)) throw errorLiquidacion(409, 'El pago ya existe.');
    validarImporte(cuenta, importeCentavos);

    // ==========================================
    // VALIDAR SESIÓN DE DIVISIÓN
    // ==========================================

    if (sesion_division_id) {
      const [sesiones] = await conexion.query(
        `
        SELECT id, mesas_id
        FROM sesiones_division_cuentas
        WHERE id = ?
        FOR UPDATE
        `,
        [sesion_division_id]
      );

      if (sesiones.length === 0) {
        const error = new Error(
          'La sesión de división no existe.'
        );
        error.status = 404;
        throw error;
      }

      const sesion = sesiones[0];

      if (sesion.mesas_id !== pedido.mesas_id) {
        const error = new Error(
          'La sesión de división no corresponde a la mesa del pedido.'
        );
        error.status = 400;
        throw error;
      }
    }

    // ==========================================
    // VALIDAR PARTICIPANTE
    // ==========================================

    if (participante_id) {
      const [participantes] = await conexion.query(
        `
        SELECT id, sesion_division_id
        FROM division_participantes
        WHERE id = ?
        FOR UPDATE
        `,
        [participante_id]
      );

      if (participantes.length === 0) {
        const error = new Error(
          'El participante no existe.'
        );
        error.status = 404;
        throw error;
      }

      const participante = participantes[0];

      if (
        participante.sesion_division_id !==
        sesion_division_id
      ) {
        const error = new Error(
          'El participante no pertenece a la sesión de división indicada.'
        );
        error.status = 400;
        throw error;
      }
      await validarParticipante(conexion, participante_id, importeCentavos);
    }

    // ==========================================
    // INSERTAR PAGO
    // ==========================================

    const queryPago = `
      INSERT INTO pagos (
        id,
        metodo_de_pago,
        total_seleccionado,
        verificacion_estado,
        estado,
        origen,
        creado_en,
        pedidos_id,
        sesion_division_id,
        participante_id,
        usuarios_id
      )
      VALUES (
        ?,
        ?,
        ?,
        'pendiente',
        'pendiente',
        'mesera',
        NOW(),
        ?,
        ?,
        ?,
        ?
      )
    `;

    await conexion.query(queryPago, [
      idPago,
      metodo_de_pago,
      importe,
      pedidos_id,
      sesion_division_id || null,
      participante_id || null,
      usuarios_id
    ]);

    // Registrar no equivale a verificar: el nuevo pago aún no reduce la deuda.
    const liquidacion = await actualizarLiquidacion(conexion, pedido, await calcularCuenta(conexion, pedido));

    // ==========================================
    // CONFIRMAR TRANSACCIÓN
    // ==========================================

    await conexion.commit();
    transaccionIniciada = false;

    return res.status(201).json({
      mensaje:
        'Pago registrado pendiente de verificación.',
      id_pago: idPago,
      estado: 'pendiente',
      verificacion_estado: 'pendiente',
      liquidacion
    });
  } catch (error) {
    // ==========================================
    // REVERTIR SI HUBO ERROR
    // ==========================================

    if (transaccionIniciada && conexion) {
      try {
        await conexion.rollback();
      } catch (errorRollback) {
        console.error(
          'Error al revertir el pago:',
          errorRollback.message
        );
      }
    }

    if (error.status) {
      return res.status(error.status).json({
        error: error.message
      });
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error:
          'El pago entra en conflicto con un registro existente.'
      });
    }

    console.error(
      '❌ Error al procesar el pago:',
      error
    );

    return res.status(500).json({
      error:
        'Hubo un error interno al registrar el pago.',
      detalles: error.message
    });
  } finally {
    // Esta conexión sí es independiente,
    // por eso sí debemos cerrarla.
    if (conexion) {
      try {
        await conexion.end();
      } catch (errorConexion) {
        console.error(
          'Error al cerrar la conexión de pago:',
          errorConexion.message
        );
      }
    }
  }
};

// ==========================================
// VERIFICAR PAGO Y LIQUIDAR (registrar un pago pendiente no liquida la deuda)
// ==========================================
exports.verificarPago = async (req, res) => {
  const { verificacion_estado } = req.body || {};
  if (!['verificado', 'rechazado'].includes(verificacion_estado)) {
    return res.status(400).json({ error: 'verificacion_estado debe ser verificado o rechazado.' });
  }
  let conexion;
  let transaccionIniciada = false;
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    await conexion.beginTransaction();
    transaccionIniciada = true;
    const [ubicacion] = await conexion.query('SELECT pedidos_id FROM pagos WHERE id = ?', [req.params.id]);
    if (!ubicacion.length) throw errorLiquidacion(404, 'El pago no existe.');
    const pedido = await bloquearPedido(conexion, ubicacion[0].pedidos_id);
    const [pagos] = await conexion.query('SELECT * FROM pagos WHERE id = ? FOR UPDATE', [req.params.id]);
    const pago = pagos[0];
    if (!pago || pago.pedidos_id !== pedido.id) throw errorLiquidacion(409, 'El pago cambió durante la operación.');
    const estado = verificacion_estado === 'verificado' ? 'pagado' : 'cancelado';
    const repetido = pago.verificacion_estado === verificacion_estado && pago.estado === estado;
    if (!repetido) {
      if (pago.verificacion_estado !== 'pendiente' || pago.estado !== 'pendiente') {
        throw errorLiquidacion(409, 'El pago ya fue procesado; no se puede cambiar su decisión.');
      }
      if (pedido.estado !== 'abierto') throw errorLiquidacion(409, 'El pedido no está abierto.');
      const cuenta = await calcularCuenta(conexion, pedido);
      if (verificacion_estado === 'verificado' && centavos(pago.total_seleccionado) > cuenta.saldo) {
        throw errorLiquidacion(409, 'El pago supera el saldo actual del pedido.');
      }
      const [resultado] = await conexion.query(
        `UPDATE pagos SET verificacion_estado = ?, estado = ?${
          verificacion_estado === 'verificado' ? ', verificado_en = UTC_TIMESTAMP()' : ''
        } WHERE id = ?`,
        [verificacion_estado, estado, pago.id]
      );
      if (resultado.affectedRows !== 1) throw new Error('No se actualizó el pago.');
    }
    if (pago.participante_id) await validarParticipante(conexion, pago.participante_id);
    const liquidacion = await actualizarLiquidacion(conexion, pedido, await calcularCuenta(conexion, pedido));
    await conexion.commit();
    transaccionIniciada = false;
    return res.status(200).json({
      mensaje: verificacion_estado === 'verificado' ? 'Pago verificado.' : 'Pago rechazado.',
      id_pago: pago.id, estado, verificacion_estado, liquidacion
    });
  } catch (error) {
    if (transaccionIniciada) {
      try { await conexion.rollback(); }
      catch (errorRollback) { console.error('Error al revertir verificación:', errorRollback.message); }
    }
    console.error('Error al verificar pago:', error.message);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Error al verificar el pago.' });
  } finally {
    if (conexion) {
      try { await conexion.end(); }
      catch (errorConexion) { console.error('Error al cerrar conexión de verificación:', errorConexion.message); }
    }
  }
};

// ==========================================
// OBTENER PAGO POR ID
// ==========================================
exports.obtenerPagoPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.promise().query(
      `
      SELECT
        id,
        metodo_de_pago,
        total_seleccionado,
        verificacion_estado,
        estado,
        origen,
        creado_en,
        pedidos_id,
        sesion_division_id,
        participante_id,
        usuarios_id
      FROM pagos
      WHERE id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Pago no encontrado.'
      });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error(
      '❌ Error al obtener el pago:',
      error
    );

    return res.status(500).json({
      error: 'Error al consultar el pago.'
    });
  }
};
