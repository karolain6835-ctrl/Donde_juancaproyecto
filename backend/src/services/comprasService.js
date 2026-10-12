const db = require('../config/db');
const mysql = require('mysql2');

const errorCompra = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const idValido = id => typeof id === 'string' && id.length > 0 && id.length <= 36 && id === id.trim();
const objeto = valor => valor && typeof valor === 'object' && !Array.isArray(valor);
const filaEscrita = resultado => {
  if (resultado.affectedRows !== 1) throw new Error('La escritura no afectó exactamente una fila.');
};
const decimal = centavos => `${centavos / 100n}.${String(centavos % 100n).padStart(2, '0')}`;
const importe = valor => {
  // El contrato recibe números JSON; no redondear silenciosamente más de dos decimales.
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > 99999999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(String(valor))) throw errorCompra(400, 'precio_unitario debe ser numérico, no negativo y tener como máximo dos decimales.');
  const [entero, fraccion = ''] = String(valor).split('.');
  return BigInt(entero) * 100n + BigInt(fraccion.padEnd(2, '0'));
};

const conConexion = async (res, operacion, lectura = false) => {
  let conexion;
  let transaccion = false;
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    if (lectura) {
      await conexion.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await conexion.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    } else await conexion.beginTransaction();
    transaccion = true;
    const resultado = await operacion(conexion);
    await conexion.commit();
    transaccion = false;
    return res.status(resultado.status || 200).json(resultado.body);
  } catch (error) {
    if (transaccion) {
      try { await conexion.rollback(); }
      catch (rollback) { console.error('Error al revertir compras/proveedores:', rollback.message); }
    }
    console.error('Error en compras/proveedores:', error.message);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo completar la operación.' });
  } finally {
    if (conexion) {
      try { await conexion.end(); }
      catch (cierre) { console.error('Error al cerrar compras/proveedores:', cierre.message); }
    }
  }
};

const consultaCompras = `SELECT c.id,c.estado,
  CAST(c.total_estimado AS CHAR) AS total_estimado,CAST(c.total_recibido AS CHAR) AS total_recibido,
  DATE_FORMAT(c.creado_en,'%Y-%m-%dT%H:%i:%sZ') AS creado_en,c.proveedores_id,c.usuarios_id
  FROM compras c`;

module.exports = { errorCompra, idValido, objeto, filaEscrita, decimal, importe, conConexion, consultaCompras };
