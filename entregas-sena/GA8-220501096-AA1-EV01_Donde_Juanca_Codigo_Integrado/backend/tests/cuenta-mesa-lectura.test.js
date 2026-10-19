const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { crear } = require('./helpers/comprasSandbox');
test('Cuenta de mesa mantiene alcance, precios históricos, juegos y persistencia intacta', { skip: process.env.RUN_MYSQL_CUENTA_LECTURA_TESTS !== '1' }, async () => {
  const sandbox = await crear(), c = sandbox.connection;
  try {
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('m',1,'ocupada',NOW()),('otra',2,'ocupada',NOW())");
    await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('club','Club Colombia','CLUB',9900,0,20,1,'activo',1,'prov','hist'),('aguila','Aguila','AGUI',4800,0,20,1,'activo',1,'prov','hist')");
    for (const [id, mesa, estado] of [['p1','m','abierto'],['p2','m','abierto'],['cerrado','m','cerrado'],['otro','otra','abierto']]) await c.query('INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES (?,?,NOW(),?,?,NULL)', [id,estado,mesa,'u']);
    for (const [id,pedido,producto,qty,price,estado] of [['i1','p1','club',2,5000,'servido'],['i2','p2','club',1,5500,'enviado'],['i3','p2','aguila',1,4800,'preparando'],['cancelado','p1','club',10,5000,'cancelado'],['historico','cerrado','club',1,5000,'servido'],['externo','otro','club',1,5000,'enviado']]) await c.query('INSERT INTO pedido_items(id,pedido_id,pedidos_id,producto_id,productos_id,cantidad_pedida,cantidad_pagada,precio_unitario,estado) VALUES (?,?,?,?,?,?,0,?,?)', [id,pedido,pedido,producto,producto,qty,price,estado]);
    await c.query("INSERT INTO activos_juego(id,nombre,estado,tipo,precio_hora) VALUES ('a','Billar','ocupado','billar',3600)");
    await c.query("INSERT INTO sesiones_juego(id,tipo_juego,estado,costo_total,activos_juego_id,mesas_id,iniciada_por,pedido_items_id,fecha_inicio,tarifa_hora_aplicada) VALUES ('j','billar','activa',12000,'a','m','u','i1',NOW(),3600)");
    const tablas = ['pedidos','pedido_items','productos','sesiones_juego','pagos','movimientos_inventario','kanban_movimientos'];
    const snapshot = async () => JSON.stringify(await Promise.all(tablas.map(async table => (await c.query('SELECT * FROM '+table+' ORDER BY id'))[0])));
    const before = await snapshot(), queries = [];
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/pedidosController.js'), 'utf8'), { module, console: { error() {} }, require: n => {
      if (n === '../config/db') return { query(sql, args, cb) { queries.push(sql); assert.match(sql.trim(), /^SELECT/); c.query(sql,args).then(([rows]) => cb(null, rows), cb); } };
      return require(n.startsWith('.') ? path.join(__dirname, '../src/controllers', n) : n);
    } });
    const result = await new Promise(resolve => module.exports.obtenerCuentaConsolidada({ params: { mesa_id: 'm' } }, { status(s) { assert.equal(s,200); return this; }, json(data) { resolve(data.data); } }));
    assert.equal(result.detalle_productos.length,3); assert.equal(result.detalle_productos.filter(i => i.producto_id === 'club').length,2);
    assert.equal(result.resumen.subtotal_productos,'20300.00'); assert.equal(result.resumen.subtotal_juegos,'12000.00'); assert.equal(result.resumen.total_general,'32300.00');
    assert.equal(result.detalle_juegos[0].id,'j'); assert.equal(queries.length,2);
    assert.equal(await snapshot(),before,'Lectura no cambia stock, Kanban, pedidos, pagos ni juegos');
  } finally { await sandbox.close(); }
});
