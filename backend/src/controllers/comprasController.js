const { ejecutor } = require('../services/identidadService');
const crypto = require('crypto');
const { errorCompra, idValido, objeto, filaEscrita, decimal, importe, conConexion, consultaCompras } = require('../services/comprasService');

exports.crearCompra = (req,res) => {
  const actor = ejecutor(req, res, ['usuarios_id']);
  if (!actor) return;
  return conConexion(res, async conexion => {
    const usuarios_id = actor;
    const {proveedores_id,items} = req.body || {};
    if (!idValido(proveedores_id) || !idValido(usuarios_id) || !Array.isArray(items) || !items.length) {
      throw errorCompra(400,'Se requieren proveedores_id e items no vacío.');
    }
    const vistos = new Set();
    let total = 0n;
    const preparados = items.map(item => {
      if (!objeto(item) || !idValido(item.productos_id) || !Number.isInteger(item.cantidad) || item.cantidad <= 0 || item.cantidad > 2147483647) {
        throw errorCompra(400,'Cada ítem requiere productos_id y cantidad entera positiva dentro del rango INT.');
      }
      // La BD compara IDs sin distinguir mayúsculas; rechazar también esos duplicados.
      const clave = item.productos_id.toLowerCase();
      if (vistos.has(clave)) throw errorCompra(400,'No se permiten productos duplicados.');
      vistos.add(clave);
      const precio = importe(item.precio_unitario);
      total += precio * BigInt(item.cantidad);
      if (total > 9999999999n) throw errorCompra(400,'El total excede DECIMAL(10,2).');
      return { ...item, precio:decimal(precio) };
    });
    const [proveedores] = await conexion.query('SELECT id,estado FROM proveedores WHERE id=? LOCK IN SHARE MODE',[proveedores_id]);
    if (!proveedores.length) throw errorCompra(404,'Proveedor no encontrado.');
    if (proveedores[0].estado !== 'activo') throw errorCompra(400,'El proveedor está inactivo.');
    const [usuarios] = await conexion.query('SELECT id FROM usuarios WHERE id=? LOCK IN SHARE MODE',[usuarios_id]);
    if (!usuarios.length) throw errorCompra(404,'Usuario no encontrado.');
    const productosReales = new Set();
    for (const item of [...preparados].sort((a,b)=>a.productos_id.localeCompare(b.productos_id))) {
      const [productos] = await conexion.query('SELECT id FROM productos WHERE id=? LOCK IN SHARE MODE',[item.productos_id]);
      if (!productos.length) throw errorCompra(404,'Producto no encontrado.');
      if (productosReales.has(productos[0].id)) throw errorCompra(400,'No se permiten productos duplicados.');
      productosReales.add(productos[0].id);
      item.productos_id = productos[0].id;
    }
    const id = crypto.randomUUID();
    const [cabecera] = await conexion.query(`INSERT INTO compras
      (id,estado,total_estimado,total_recibido,creado_en,proveedores_id,usuarios_id)
      VALUES (?,'pendiente',?,0,UTC_TIMESTAMP(),?,?)`,[id,decimal(total),proveedores[0].id,usuarios[0].id]);
    filaEscrita(cabecera);
    for (const item of preparados) {
      const [resultado] = await conexion.query('INSERT INTO compra_items (id,cantidad,precio_unitario,compras_id,productos_id) VALUES (?,?,?,?,?)',
        [crypto.randomUUID(),item.cantidad,item.precio,id,item.productos_id]);
      filaEscrita(resultado);
    }
    const [[datos]] = await conexion.query(`${consultaCompras} WHERE c.id=?`,[id]);
    return { status:201,body:{mensaje:'Compra pendiente creada correctamente.',datos} };
  });
};

exports.obtenerCompras = (req,res) => conConexion(res, async conexion => {
  const query = req.query || {};
  const permitidos = ['estado','proveedores_id','usuarios_id','pagina','limite'];
  if (Object.keys(query).some(k=>!permitidos.includes(k)) || Object.values(query).some(v=>typeof v !== 'string') ||
      (query.estado !== undefined && !['pendiente','recibida','cancelada'].includes(query.estado)) ||
      ['proveedores_id','usuarios_id'].some(k=>query[k] !== undefined && !idValido(query[k]))) throw errorCompra(400,'Filtros inválidos.');
  const entero = (v,defecto) => v === undefined ? defecto : /^[1-9]\d*$/.test(v) ? Number(v) : NaN;
  const pagina = entero(query.pagina,1), limite = entero(query.limite,20), offset = (pagina-1)*limite;
  if (!Number.isSafeInteger(pagina) || !Number.isSafeInteger(limite) || limite>100 || !Number.isSafeInteger(offset)) throw errorCompra(400,'Paginación inválida.');
  const condiciones = [], parametros = [];
  for (const k of ['estado','proveedores_id','usuarios_id']) if (query[k] !== undefined) { condiciones.push(`c.${k}=?`); parametros.push(query[k]); }
  const where = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : '';
  const [[conteo]] = await conexion.query(`SELECT COUNT(*) AS total FROM compras c${where}`,parametros);
  const [datos] = await conexion.query(`${consultaCompras}${where} ORDER BY c.creado_en DESC,c.id DESC LIMIT ? OFFSET ?`,[...parametros,limite,offset]);
  const total = Number(conteo.total);
  return { body:{mensaje:'Compras consultadas correctamente.',datos,paginacion:{pagina,limite,total,total_paginas:Math.ceil(total/limite)}} };
},true);

exports.obtenerCompra = (req,res) => conConexion(res, async conexion => {
  if (!idValido(req.params.id)) throw errorCompra(400,'ID de compra inválido.');
  const [[datos]] = await conexion.query(`${consultaCompras} WHERE c.id=?`,[req.params.id]);
  if (!datos) throw errorCompra(404,'Compra no encontrada.');
  const [items] = await conexion.query(`SELECT ci.id,ci.cantidad,CAST(ci.precio_unitario AS CHAR) AS precio_unitario,
    ci.compras_id,ci.productos_id,p.nombre AS producto_nombre FROM compra_items ci
    LEFT JOIN productos p ON p.id=ci.productos_id WHERE ci.compras_id=? ORDER BY ci.productos_id,ci.id`,[datos.id]);
  return { body:{mensaje:'Compra consultada correctamente.',datos:{...datos,items}} };
},true);

const bloquearPendiente = async (conexion,id) => {
  if (!idValido(id)) throw errorCompra(400,'ID de compra inválido.');
  const [[compra]] = await conexion.query('SELECT id,estado,usuarios_id FROM compras WHERE id=? FOR UPDATE',[id]);
  if (!compra) throw errorCompra(404,'Compra no encontrada.');
  if (compra.estado !== 'pendiente') throw errorCompra(409,'Solo una compra pendiente admite esta operación.');
  return compra;
};

exports.recibirCompra = (req,res) => {
  const actor = ejecutor(req, res, ['usuarios_id']);
  if (!actor) return;
  return conConexion(res, async conexion => {
    const compra = await bloquearPendiente(conexion,req.params.id);
    const [items] = await conexion.query('SELECT id,productos_id,cantidad FROM compra_items WHERE compras_id=? ORDER BY productos_id,id FOR UPDATE',[compra.id]);
    if (!items.length) throw errorCompra(409,'La compra no tiene ítems.');
    const productos = new Map();
    for (const item of items) {
      if (!Number.isInteger(item.cantidad) || item.cantidad<=0 || item.cantidad>2147483647) throw errorCompra(409,'La compra contiene cantidades inválidas.');
      if (!productos.has(item.productos_id)) {
        const [[producto]] = await conexion.query('SELECT id,cantidad_disponible FROM productos WHERE id=? FOR UPDATE',[item.productos_id]);
        if (!producto) throw errorCompra(404,'Producto de la compra no encontrado.');
        // Canonicalizar también ítems históricos con variantes de mayúsculas del mismo ID.
        item.productos_id = producto.id;
        if (!productos.has(producto.id)) productos.set(producto.id,producto);
      }
    }
    const [usuarios] = await conexion.query('SELECT id FROM usuarios WHERE id=? LOCK IN SHARE MODE',[actor]);
    if (!usuarios.length) throw errorCompra(409,'El receptor de la compra no existe.');
    for (const item of items) {
      const producto = productos.get(item.productos_id);
      const antes = producto.cantidad_disponible, despues = antes+item.cantidad;
      if (!Number.isInteger(antes) || antes<0 || despues>2147483647) throw errorCompra(409,'La recepción excede el rango del inventario.');
      const [actualizacion] = await conexion.query('UPDATE productos SET cantidad_disponible=? WHERE id=?',[despues,producto.id]);
      filaEscrita(actualizacion);
      const [movimiento] = await conexion.query(`INSERT INTO movimientos_inventario
        (id,tipo,cantidad,stock_antes,stock_despues,referencia_tipo,referencia_id,productos_id,usuarios_id,creado_en)
        VALUES (?,'compra',?,?,?,'compra',?,?,?,UTC_TIMESTAMP())`,
        [crypto.randomUUID(),item.cantidad,antes,despues,compra.id,producto.id,actor]);
      filaEscrita(movimiento);
      producto.cantidad_disponible = despues;
    }
    const [resultado] = await conexion.query("UPDATE compras SET estado='recibida',total_recibido=total_estimado WHERE id=? AND estado='pendiente'",[compra.id]);
    filaEscrita(resultado);
    const [[datos]] = await conexion.query(`${consultaCompras} WHERE c.id=?`,[compra.id]);
    // Costos e historial quedan deliberadamente pendientes: su relación por producto es ambigua.
    return { body:{mensaje:'Compra recibida correctamente.',datos} };
  });
};

exports.cancelarCompra = (req,res) => conConexion(res, async conexion => {
  const compra = await bloquearPendiente(conexion,req.params.id);
  const [resultado] = await conexion.query("UPDATE compras SET estado='cancelada' WHERE id=? AND estado='pendiente'",[compra.id]);
  filaEscrita(resultado);
  const [[datos]] = await conexion.query(`${consultaCompras} WHERE c.id=?`,[compra.id]);
  return { body:{mensaje:'Compra cancelada correctamente.',datos} };
});
