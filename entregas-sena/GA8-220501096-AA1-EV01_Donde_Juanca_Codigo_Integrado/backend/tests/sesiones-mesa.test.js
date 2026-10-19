const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { crear, ejecutarSQL } = require('./helpers/comprasSandbox');
test('Visita compartida: identidad, consumos, concurrencia, liberación, traslado e históricos', { skip: process.env.RUN_MYSQL_SESIONES_MESA_TESTS !== '1' }, async t => {
  const sandbox = await crear(), c = sandbox.connection;
  const load = file => {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers', file), 'utf8'), { module, exports: module.exports, console: { error() {} }, require: n => n === '../config/db' ? { dbConfig: sandbox.config, query: (sql,args,cb) => c.query(sql,args).then(([r]) => cb(null,r),cb) } : require(n.startsWith('.') ? path.join(__dirname, '../src/controllers', n) : n) });
    return module.exports;
  };
  const orders = load('pedidosController.js'), people = load('participantesController.js'), visits = load('sesionesMesaController.js'), mesas = load('mesasController.js');
  const invoke = (fn, body = {}, params = {}) => new Promise((resolve,reject) => Promise.resolve(fn({ body, params, usuario: { id: 'u', rol: 'Administrador' } }, { status(s) { this.s = s; return this; }, json(data) { resolve({ status: this.s || 200, data }); } })).catch(reject));
  const create = (mesa = 'm', extra = {}) => invoke(orders.crearPedido, { mesas_id: mesa, usuarios_id: 'u', clientes_id: 'c', ...extra });
  const list = id => invoke(people.listar, {}, { id });
  let first, second, session, carlos, temp, another;
  try {
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u','Actor','u@example.invalid','fixture','activo',1)");
    await c.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('c','Carlos','activo','u')");
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('m',1,'disponible',NOW()),('otra',2,'disponible',NOW()),('manual',3,'disponible',NOW()),('destino',4,'disponible',NOW()),('personas',5,'disponible',NOW())");
    await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('pr','Poker','P',100,0,50,1,'activo',1,'prov','hist')");
    await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES ('legado','cerrado',NOW(),'m','u','c')");
    await c.query("INSERT INTO jugadores(id,nombre,mesas_id,pedido_id,tipo_participante) VALUES ('persona-legada','Anterior','m','legado','temporal')");
    await t.test('lectura no crea visitas ni reconstruye identidad histórica', async () => {
      const r = await invoke(visits.listar, {}, { id: 'm' }); assert.equal(r.status,200); assert.equal(r.data.sesion,null); assert.equal(r.data.datos.length,0);
      assert.equal((await list('legado')).data.datos[0].id,'persona-legada');
      assert.equal((await c.query('SELECT COUNT(*) AS n FROM sesiones_mesa'))[0][0].n,0);
    });
    await t.test('primer pedido crea visita; segundo reutiliza visita y cliente registrado', async () => {
      const r = await create(); assert.equal(r.status,201); first = r.data.id_pedido;
      const r2 = await create(); assert.equal(r2.status,201); second = r2.data.id_pedido;
      const [rows] = await c.query('SELECT sesion_mesa_id FROM pedidos WHERE id IN (?,?)',[first,second]); session = rows[0].sesion_mesa_id;
      assert.ok(session); assert.ok(rows.every(p => p.sesion_mesa_id === session));
      const persons = (await list(first)).data.datos; assert.equal(persons.length,1); carlos = persons[0].id;
      assert.equal((await list(second)).data.datos[0].id,carlos); assert.equal(persons[0].pedido_id,null);
    });
    await t.test('pedidos concurrentes no duplican visita ni cliente', async () => {
      const results = await Promise.all([create(),create()]); assert.ok(results.every(r => r.status === 201));
      assert.equal((await c.query("SELECT COUNT(*) AS n FROM sesiones_mesa WHERE mesas_id='m' AND estado='activa'"))[0][0].n,1);
      assert.equal((await list(first)).data.datos.length,1);
    });
    await t.test('temporales homónimos persisten entre pedidos y pueden reutilizarse al crear', async () => {
      const a = await invoke(people.agregar,{ tipo_participante:'temporal',nombre:'Laura' },{ id:first });
      const b = await invoke(people.agregar,{ tipo_participante:'temporal',nombre:'Laura' },{ id:second });
      assert.equal(a.status,201); assert.equal(b.status,201); temp = a.data.datos.id; assert.notEqual(temp,b.data.datos.id);
      assert.equal((await list(second)).data.datos.length,3);
      const r = await create('m',{ clientes_id:null,participante_id:temp }); assert.equal(r.status,201);
      assert.equal((await list(r.data.id_pedido)).data.datos.length,3);
      assert.equal((await invoke(people.agregar,{ tipo_participante:'registrado',clientes_id:'c' },{ id:second })).status,409);
    });
    const add = (id, person, qty, price = 100) => invoke(orders.agregarItemPedido,{ productos_id:'pr',participante_id:person,cantidad_pedida:qty,precio_unitario:price },{ id_pedido:id });
    await t.test('consumos personales abarcan varios pedidos sin mezclar personas ni precios', async () => {
      assert.equal((await add(first,carlos,2)).status,201); assert.equal((await add(second,carlos,1,110)).status,201);
      assert.equal((await add(second,temp,1)).status,201);
      const before = (await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0].cantidad_disponible;
      const r = await invoke(visits.consumos, {}, { sesion_id:session,participante_id:carlos }); assert.equal(r.status,200);
      assert.equal(r.data.datos.total_consumido,'310.00'); assert.equal(r.data.datos.items.length,2);
      assert.equal(r.data.datos.resumen_productos[0].cantidad_total,3);
      assert.equal(r.data.datos.resumen_productos[0].subtotal_total,'310.00');
      assert.equal((await invoke(visits.consumos, {}, { sesion_id:session,participante_id:temp })).data.datos.total_consumido,'100.00');
      assert.equal((await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0].cantidad_disponible,before);
    });
    await t.test('otra mesa mantiene visita e identidad separadas; cruce rechazado', async () => {
      const r = await create('otra'); another = r.data.id_pedido; assert.equal(r.status,201);
      const [p] = (await list(another)).data.datos; assert.notEqual(p.sesion_mesa_id,session); assert.notEqual(p.id,carlos);
      assert.equal((await add(another,carlos,1)).status,409);
      assert.equal((await create('otra',{ clientes_id:null,participante_id:temp })).status,409);
      assert.equal((await invoke(visits.consumos, {}, { sesion_id:p.sesion_mesa_id,participante_id:carlos })).status,404);
    });
    await t.test('ocupación manual crea visita; liberar sin actividad la cierra; volver crea otra', async () => {
      assert.equal((await invoke(mesas.actualizarEstadoMesa,{ estado:'ocupada' },{ id:'manual' })).status,200);
      const r = await invoke(visits.listar, {}, { id:'manual' }); const id = r.data.sesion.id;
      assert.equal((await invoke(mesas.actualizarEstadoMesa,{ estado:'disponible' },{ id:'manual' })).status,200);
      const [[closed]] = await c.query('SELECT estado,cerrada_en FROM sesiones_mesa WHERE id=?',[id]); assert.equal(closed.estado,'cerrada'); assert.ok(closed.cerrada_en);
      await invoke(mesas.actualizarEstadoMesa,{ estado:'ocupada' },{ id:'manual' });
      assert.notEqual((await invoke(visits.listar, {}, { id:'manual' })).data.sesion.id,id);
    });
    await t.test('liberación bloqueada conserva visita activa', async () => {
      assert.equal((await invoke(mesas.actualizarEstadoMesa,{ estado:'disponible' },{ id:'m' })).status,409);
      assert.equal((await c.query('SELECT estado,cerrada_en FROM sesiones_mesa WHERE id=?',[session]))[0][0].estado,'activa');
    });
    await t.test('participantes directos de mesa sin pedido se reutilizan en su primera solicitud', async () => {
      assert.equal((await invoke(visits.agregar,{ tipo_participante:'temporal',nombre:'Sin visita' },{ id:'personas' })).status,409);
      await invoke(mesas.actualizarEstadoMesa,{ estado:'ocupada' },{ id:'personas' });
      const r = await invoke(visits.agregar,{ tipo_participante:'registrado',clientes_id:'c' },{ id:'personas' }); assert.equal(r.status,201);
      assert.equal((await invoke(visits.agregar,{ tipo_participante:'registrado',clientes_id:'c' },{ id:'personas' })).status,409);
      assert.equal((await invoke(visits.agregar,{ tipo_participante:'temporal',nombre:'Invitado' },{ id:'personas' })).status,201);
      const created = await create('personas'); assert.equal(created.status,201);
      const rows = (await list(created.data.id_pedido)).data.datos;
      assert.equal(rows.length,2); assert.equal(rows.find(p => p.clientes_id === 'c').id,r.data.datos.id);
    });
    await t.test('traslado mueve visita y todas sus identidades; próximo pedido la reutiliza', async () => {
      assert.equal((await invoke(mesas.trasladarMesa,{ mesa_origen_id:'m',mesa_destino_id:'destino' })).status,200);
      assert.equal((await invoke(visits.listar, {}, { id:'destino' })).data.sesion.id,session);
      assert.equal((await invoke(visits.listar, {}, { id:'m' })).data.sesion,null);
      assert.equal((await create('destino')).status,201); assert.equal((await list(first)).data.datos.length,3);
      assert.equal((await c.query('SELECT mesas_id FROM jugadores WHERE id=?',[temp]))[0][0].mesas_id,'destino');
      assert.equal((await c.query("SELECT sesion_mesa_id FROM pedidos WHERE id='legado'"))[0][0].sesion_mesa_id,null);
    });
    await t.test('cierre automático existente sincroniza visita sin cambiar cálculo financiero', async () => {
      const { calcularCuenta,actualizarLiquidacion } = require('../src/services/liquidacionService');
      const [[pedido]] = await c.query('SELECT id,mesas_id,estado FROM pedidos WHERE id=?',[another]);
      await c.beginTransaction(); await c.query('SELECT id FROM mesas WHERE id=? FOR UPDATE',[pedido.mesas_id]);
      const result = await actualizarLiquidacion(c,pedido,await calcularCuenta(c,pedido)); await c.commit();
      assert.equal(result.cuenta_liquidada,true); assert.equal((await invoke(visits.listar, {}, { id:'otra' })).data.sesion,null);
    });
    await t.test('migración repetible e índice único protegen visita activa sin backfill', async () => {
      await ejecutarSQL(c,'v2.39_sesiones_mesa.sql'); await ejecutarSQL(c,'v2.39_sesiones_mesa.sql');
      await assert.rejects(c.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en) VALUES ('duplicada','destino','activa',NOW())"), e => e.code === 'ER_DUP_ENTRY');
      assert.equal((await c.query("SELECT sesion_mesa_id FROM jugadores WHERE id='persona-legada'"))[0][0].sesion_mesa_id,null);
      assert.equal((await c.query('SELECT COUNT(*) AS n FROM jugadores WHERE sesion_mesa_id=?',[session]))[0][0].n,3);
    });
  } finally { await sandbox.close(); }
});
test('Migración 7B preserva datos de 7A sin inferir visitas', { skip: process.env.RUN_MYSQL_SESIONES_MESA_TESTS !== '1' }, async () => {
  const sandbox = await crear({ participantes:false }), c = sandbox.connection;
  try {
    await ejecutarSQL(c,'v2.37_participantes_pedidos.sql'); await ejecutarSQL(c,'v2.38_participantes_temporales_homonimos.sql');
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('m',1,'ocupada',NOW())");
    await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES ('p','abierto',NOW(),'m','u',NULL)");
    await c.query("INSERT INTO jugadores(id,nombre,mesas_id,pedido_id,tipo_participante) VALUES ('j','Temporal previo','m','p','temporal')");
    await ejecutarSQL(c,'v2.39_sesiones_mesa.sql');
    assert.equal((await c.query("SELECT sesion_mesa_id FROM pedidos WHERE id='p'"))[0][0].sesion_mesa_id,null);
    const [[person]] = await c.query("SELECT pedido_id,sesion_mesa_id FROM jugadores WHERE id='j'"); assert.equal(person.pedido_id,'p'); assert.equal(person.sesion_mesa_id,null);
    assert.equal((await c.query('SELECT COUNT(*) AS n FROM sesiones_mesa'))[0][0].n,0);
  } finally { await sandbox.close(); }
});
