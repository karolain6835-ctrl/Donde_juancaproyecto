const db = require('../config/db');
const mysql = require('mysql2');

// ==========================================
// REGISTRAR PAGO
// ==========================================
exports.registrarPago = async (req, res) => {
  const {
    id,
    metodo_de_pago,
    total_seleccionado,
    pedidos_id,
    usuarios_id,
    sesion_division_id,
    participante_id
  } = req.body || {};

  // ==========================================
  // VALIDACIONES BÁSICAS
  // ==========================================

  if (!metodo_de_pago || !pedidos_id || !usuarios_id) {
    return res.status(400).json({
      error:
        'Faltan campos obligatorios (metodo_de_pago, pedidos_id, usuarios_id).'
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

  const importe = Number(total_seleccionado);

  if (!Number.isFinite(importe) || importe <= 0) {
    return res.status(400).json({
      error: 'total_seleccionado debe ser un importe mayor que 0.'
    });
  }

  // La columna actual es DECIMAL(10,0)
  if (!Number.isInteger(importe) || importe > 9999999999) {
    return res.status(400).json({
      error:
        'total_seleccionado debe ser un importe entero de hasta 10 dígitos.'
    });
  }

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

  const idPago = id || `pago-${Date.now()}`;

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

    const [pedidos] = await conexion.query(
      `
      SELECT id, mesas_id
      FROM pedidos
      WHERE id = ?
      FOR UPDATE
      `,
      [pedidos_id]
    );

    if (pedidos.length === 0) {
      const error = new Error('El pedido no existe.');
      error.status = 404;
      throw error;
    }

    const pedido = pedidos[0];

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
      verificacion_estado: 'pendiente'
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