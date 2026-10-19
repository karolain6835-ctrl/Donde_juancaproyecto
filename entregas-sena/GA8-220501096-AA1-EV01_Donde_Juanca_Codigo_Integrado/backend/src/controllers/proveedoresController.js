const crypto = require('crypto');
const { errorCompra, idValido, objeto, filaEscrita, conConexion } = require('../services/comprasService');

const validar = (body, actual = null) => {
  const campos = ['telefono','email','contacto_nombre','estado'];
  if (!objeto(body) || !Object.keys(body).length || Object.keys(body).some(k => !campos.includes(k))) {
    throw errorCompra(400, 'Envía únicamente telefono, email, contacto_nombre y estado.');
  }
  const datos = { telefono:null, email:null, contacto_nombre:null, estado:'activo', ...actual, ...body };
  if (!['activo','inactivo'].includes(datos.estado)) throw errorCompra(400, 'estado debe ser activo o inactivo.');
  for (const [campo, largo] of [['telefono',20],['email',150],['contacto_nombre',100]]) {
    if (datos[campo] !== null && (typeof datos[campo] !== 'string' || datos[campo].length > largo)) {
      throw errorCompra(400, `${campo} debe ser texto dentro de su longitud permitida o null.`);
    }
  }
  return datos;
};

exports.obtenerProveedores = (req,res) => conConexion(res, async conexion => {
  const [datos] = await conexion.query('SELECT id,telefono,email,contacto_nombre,estado FROM proveedores ORDER BY contacto_nombre ASC,id ASC');
  return { body: { mensaje:'Proveedores consultados correctamente.',datos,total:datos.length } };
}, true);

exports.crearProveedor = (req,res) => conConexion(res, async conexion => {
  const datos = validar(req.body);
  const id = crypto.randomUUID();
  const [resultado] = await conexion.query(`INSERT INTO proveedores (id,telefono,email,contacto_nombre,estado)
    VALUES (?,?,?,?,?)`, [id,datos.telefono,datos.email,datos.contacto_nombre,datos.estado]);
  filaEscrita(resultado);
  return { status:201, body:{ mensaje:'Proveedor creado correctamente.',datos:{id,...datos} } };
});

exports.actualizarProveedor = (req,res) => conConexion(res, async conexion => {
  const {id} = req.params;
  if (!idValido(id)) throw errorCompra(400,'ID de proveedor inválido.');
  const [filas] = await conexion.query('SELECT id,telefono,email,contacto_nombre,estado FROM proveedores WHERE id=? FOR UPDATE',[id]);
  if (!filas.length) throw errorCompra(404,'Proveedor no encontrado.');
  const datos = validar(req.body,filas[0]);
  const [resultado] = await conexion.query('UPDATE proveedores SET telefono=?,email=?,contacto_nombre=?,estado=? WHERE id=?',
    [datos.telefono,datos.email,datos.contacto_nombre,datos.estado,id]);
  filaEscrita(resultado);
  return { body:{ mensaje:'Proveedor actualizado correctamente.',datos:{...datos,id} } };
});
