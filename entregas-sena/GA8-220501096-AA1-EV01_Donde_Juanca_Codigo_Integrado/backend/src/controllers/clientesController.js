const { registrarAuditoria } = require('../services/auditoriaService');
const { ejecutor } = require('../services/identidadService');
const mysql = require('mysql2');
const db = require('../config/db');
const { randomUUID } = require('node:crypto');
const historialClientes=require('../services/historialClientesService');

const errorCliente = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const columnas = 'id,nombre,email,telefono,estado,delete_at,usuarios_id';
const texto = (valor, campo, maximo) => {
  if (typeof valor !== 'string' || !valor.trim() || [...valor].length > maximo) {
    throw errorCliente(400, `${campo} debe ser texto no vacío de hasta ${maximo} caracteres.`);
  }
  return valor.trim();
};
const identificador = valor => {
  const id = texto(valor, 'id', 36);
  if (id !== valor) throw errorCliente(400, 'El ID no puede tener espacios al inicio o al final.');
  return id;
};
const validarBody = (body, permitidos) => {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(campo => !permitidos.includes(campo))) {
    throw errorCliente(400, 'Body inválido o con campos no permitidos.');
  }
};
const contacto = (valor, campo) => {
  if (valor === null) return null;
  const resultado = texto(valor, campo, campo === 'email' ? 150 : 20);
  if (campo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resultado)) throw errorCliente(400, 'Formato de email inválido.');
  return resultado;
};
const entero = (valor, defecto, maximo) => {
  if (valor === undefined) return defecto;
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(Number(valor)) || Number(valor) > maximo) {
    throw errorCliente(400, 'Paginación inválida.');
  }
  return Number(valor);
};
const estadoValido = valor => {
  if (!['activo', 'inactivo'].includes(valor)) throw errorCliente(400, 'estado debe ser activo o inactivo.');
  return valor;
};
const escrita = resultado => {
  if (resultado.affectedRows !== 1) throw new Error('La escritura no afectó exactamente una fila.');
};
const ejecutar = async (res, operacion, lectura = false) => {
  let conexion, transaccion = false;
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    if (lectura) {
      await conexion.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await conexion.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    } else await conexion.beginTransaction();
    transaccion = true;
    const respuesta = await operacion(conexion);
    await conexion.commit(); transaccion = false;
    return res.status(respuesta.status || 200).json(respuesta.body);
  } catch (error) {
    if (transaccion) {
      try { await conexion.rollback(); } catch (e) { console.error('Rollback clientes:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
    }
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El email o ID ya está registrado.' });
    if (!error.status) console.error('Error clientes:', new Error('Fallo interno; detalles sensibles omitidos.').stack);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo completar la operación de clientes.' });
  } finally {
    if (conexion) {
      try { await conexion.end(); } catch (e) { console.error('Cierre clientes:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
    }
  }
};
exports.historialCliente = (req,res) => ejecutar(res,async c=>({body:await historialClientes.consultar(c,req.params.id,req.query)}),true);
exports.listarClientes = (req, res) => ejecutar(res, async c => {
  const pagina = entero(req.query.pagina, 1, Number.MAX_SAFE_INTEGER);
  const limite = entero(req.query.limite, 20, 100);
  const offset = (pagina - 1) * limite;
  if (!Number.isSafeInteger(offset)) throw errorCliente(400, 'Paginación fuera de rango.');
  const filtros = [], valores = [];
  if (req.query.estado !== undefined) { filtros.push('estado=?'); valores.push(estadoValido(req.query.estado)); }
  if (req.query.buscar !== undefined) {
    const buscar = texto(req.query.buscar, 'buscar', 150);
    // Escapa comodines: buscar representa texto literal, no un patrón del cliente.
    const patron = `%${buscar.replace(/[!%_]/g, caracter => `!${caracter}`)}%`;
    filtros.push("(nombre LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!' OR telefono LIKE ? ESCAPE '!')");
    valores.push(patron, patron, patron);
  }
  const where = filtros.length ? ` WHERE ${filtros.join(' AND ')}` : '';
  const [[conteo]] = await c.query(`SELECT COUNT(*) AS total FROM clientes${where}`, valores);
  const [datos] = await c.query(`SELECT ${columnas} FROM clientes${where} ORDER BY id LIMIT ? OFFSET ?`, [...valores, limite, offset]);
  return { body: { mensaje: 'Clientes consultados correctamente.', pagina, limite, total: conteo.total, datos } };
}, true);
exports.obtenerCliente = (req, res) => ejecutar(res, async c => {
  const id = identificador(req.params.id);
  const [[cliente]] = await c.query(`SELECT ${columnas} FROM clientes WHERE id=?`, [id]);
  if (!cliente) throw errorCliente(404, 'Cliente inexistente.');
  return { body: { mensaje: 'Cliente encontrado.', cliente } };
}, true);
exports.registrarCliente = (req, res) => {
  const actor = ejecutor(req, res, ['usuarios_id']);
  if (!actor) return;
  return ejecutar(res, async c => {
    validarBody(req.body, ['id', 'nombre', 'email', 'telefono']);
    const b = req.body;
    const id = b.id === undefined ? randomUUID() : identificador(b.id);
    const nombre = texto(b.nombre, 'nombre', 100);
    const usuario = identificador(actor);
    const email = b.email === undefined ? null : contacto(b.email, 'email');
    const telefono = b.telefono === undefined ? null : contacto(b.telefono, 'telefono');
    const [[existe]] = await c.query('SELECT id FROM usuarios WHERE id=? LOCK IN SHARE MODE', [usuario]);
    if (!existe) throw errorCliente(404, 'Usuario inexistente.');
    const [insert] = await c.query(`INSERT INTO clientes (id,nombre,email,telefono,estado,delete_at,usuarios_id)
      VALUES (?,?,?,?,'activo',NULL,?)`, [id, nombre, email, telefono, usuario]);
    escrita(insert);
    const [[cliente]] = await c.query(`SELECT ${columnas} FROM clientes WHERE id=?`, [id]);
    return { status: 201, body: { mensaje: 'Cliente registrado correctamente.', cliente } };
  });
};
exports.actualizarCliente = (req,res) => {
  const actor = ejecutor(req,res);
  if (!actor) return;
  return ejecutar(res, async c => {
  validarBody(req.body, ['nombre', 'email', 'telefono', 'estado']);
  const cambios = [], valores = [];
  for (const [campo, valor] of Object.entries(req.body)) {
    cambios.push(`${campo}=?`);
    valores.push(campo === 'nombre' ? texto(valor, campo, 100) : campo === 'estado' ? estadoValido(valor) : contacto(valor, campo));
  }
  if (!cambios.length) throw errorCliente(400, 'Envía al menos un campo para actualizar.');
  const id = identificador(req.params.id);
  const [[existe]] = await c.query(`SELECT ${columnas} FROM clientes WHERE id=? FOR UPDATE`, [id]);
  if (!existe) throw errorCliente(404, 'Cliente inexistente.');
  const [update] = await c.query(`UPDATE clientes SET ${cambios.join(',')} WHERE id=?`, [...valores, id]);
  escrita(update);
  const [[cliente]] = await c.query(`SELECT ${columnas} FROM clientes WHERE id=?`, [id]);
  await registrarAuditoria(c,actor,'clientes','cliente_actualizado','clientes',id,{
    antes: Object.fromEntries(Object.keys(req.body).map(k=>[k,existe[k]])),
    despues: Object.fromEntries(Object.keys(req.body).map(k=>[k,cliente[k]])),creador_original:cliente.usuarios_id
  });
  return { body: { mensaje: 'Cliente actualizado correctamente.', cliente } };
});
};
