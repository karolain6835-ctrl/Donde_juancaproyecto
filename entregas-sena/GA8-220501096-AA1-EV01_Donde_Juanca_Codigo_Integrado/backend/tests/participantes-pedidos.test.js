const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { crear, ejecutarSQL } = require('./helpers/comprasSandbox');
const { validarParticipante } = require('../src/services/participantesService');
test('Participantes: identidad temporal y registrada válida, sin datos de contacto', () => {
  assert.deepEqual(validarParticipante({ tipo_participante: 'temporal', nombre: '  Invitado  ' }), { tipo_participante: 'temporal', nombre: 'Invitado', clientes_id: null });
  assert.equal(validarParticipante({ tipo_participante: 'registrado', clientes_id: 'real' }).clientes_id, 'real');
  for (const body of [{}, { tipo_participante: 'temporal', nombre: ' ' }, { tipo_participante: 'temporal', nombre: 'x'.repeat(101) }, { tipo_participante: 'registrado', clientes_id: null }]) assert.throws(() => validarParticipante(body), { status: 400 });
});
test('Participantes y consumos reales, migración repetible y datos históricos', { skip: process.env.RUN_MYSQL_PARTICIPANTES_TESTS !== '1' }, async t => {
  const sandbox = await crear(), c = sandbox.connection;
  let failIdentity = false;
  const load = name => {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers', name), 'utf8'), { module, exports: module.exports, console: { error() {} }, require: n => {
      if (n === '../config/db') return { dbConfig: sandbox.config, query: (sql, args, cb) => c.query(sql, args).then(([r]) => cb(null, r), cb) };
      if (n === 'mysql2') return { createConnection(config) {
        const real = require('mysql2').createConnection(config).promise();
        return { promise: () => ({ beginTransaction: () => real.beginTransaction(), commit: () => real.commit(), rollback: () => real.rollback(), end: () => real.end(), query(sql, args) {
          if (failIdentity && sql.includes('INSERT INTO jugadores')) throw new Error('Fallo de identidad');
          return real.query(sql, args);
        } }) };
      } };
      return require(n.startsWith('.') ? path.join(__dirname, '../src/controllers', n) : n);
    } });
    return module.exports;
  };
  const orders = load('pedidosController.js'), participants = load('participantesController.js');
  const invoke = (fn, body = {}, params = {}) => new Promise((resolve, reject) => Promise.resolve(fn({ body, params, usuario: { id: 'u', rol: 'Administrador' } }, { status(s) { this.s = s; return this; }, json(data) { resolve({ status: this.s || 200, data }); } })).catch(reject));
  try {
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u','Actor','u@example.invalid','fixture','activo',1)");
    await c.query("INSERT INTO mesas(id,numero,estado) VALUES ('m',1,'disponible'),('dest',2,'disponible'),('otra',3,'disponible')");
    await c.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('c','Carlos','activo','u'),('c2','Laura','activo','u'),('inactive','Inactivo','inactivo','u')");
    await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('pr','Producto','COD',100,50,20,1,'activo',1,'prov','hist')");
    await c.query("INSERT INTO jugadores(id,nombre,mesas_id) VALUES ('legado','Jugador histórico','m')");
    let id, carlos, laura;
    await t.test('crear registrado inicializa identidad del cliente activo', async () => {
      const r = await invoke(orders.crearPedido, { mesas_id: 'm', usuarios_id: 'u', clientes_id: 'c' });
      assert.equal(r.status, 201); id = r.data.id_pedido;
      const r2 = await invoke(participants.listar, {}, { id });
      assert.equal(r2.data.datos.length, 1); carlos = r2.data.datos[0].id;
      assert.equal(r2.data.datos[0].clientes_id, 'c'); assert.equal(r2.data.datos[0].nombre, 'Carlos');
    });
    await t.test('temporal sin contacto, duplicados y cliente inactivo', async () => {
      const r = await invoke(participants.agregar, { tipo_participante: 'temporal', nombre: 'Laura' }, { id });
      assert.equal(r.status, 201); laura = r.data.datos.id; assert.equal(r.data.datos.clientes_id, null);
      const homonimo = await invoke(participants.agregar, { tipo_participante: 'temporal', nombre: 'Laura' }, { id });
      assert.equal(homonimo.status, 201); assert.notEqual(homonimo.data.datos.id, laura);
      assert.equal((await invoke(participants.agregar, { tipo_participante: 'registrado', clientes_id: 'c' }, { id })).status, 409);
      assert.equal((await invoke(participants.agregar, { tipo_participante: 'registrado', clientes_id: 'inactive' }, { id })).status, 409);
      assert.equal((await invoke(participants.agregar, { tipo_participante: 'registrado', clientes_id: 'missing' }, { id })).status, 404);
    });
    await t.test('altas simultáneas evitan identidad duplicada; pedido cerrado impide altas', async () => {
      const body = { tipo_participante: 'registrado', clientes_id: 'c2' };
      const results = await Promise.all([invoke(participants.agregar, body, { id }), invoke(participants.agregar, body, { id })]);
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
      const list = await invoke(participants.listar, {}, { id });
      assert.equal(list.data.datos.filter(p => p.tipo_participante === 'registrado').length, 2);
      assert.equal(list.data.datos.filter(p => p.tipo_participante === 'temporal').length, 2);
      assert.ok(list.data.datos.every(p => p.pedido_id === null && p.sesion_mesa_id));
      await c.query("UPDATE pedidos SET estado='cerrado' WHERE id=?", [id]);
      assert.equal((await invoke(participants.agregar, { tipo_participante: 'temporal', nombre: 'Otro' }, { id })).status, 409);
      await c.query("UPDATE pedidos SET estado='abierto' WHERE id=?", [id]);
    });
    await t.test('fallo al inicializar identidad revierte pedido y ocupación', async () => {
      const [[before]] = await c.query('SELECT COUNT(*) AS n FROM pedidos');
      failIdentity = true;
      assert.equal((await invoke(orders.crearPedido, { mesas_id: 'dest', usuarios_id: 'u', clientes_id: 'c' })).status, 500);
      failIdentity = false;
      assert.equal((await c.query('SELECT COUNT(*) AS n FROM pedidos'))[0][0].n, before.n);
      assert.equal((await c.query("SELECT estado FROM mesas WHERE id='dest'"))[0][0].estado, 'disponible');
    });
    let temporalOrder;
    await t.test('pedido temporal con cliente NULL; alta inválida no persiste', async () => {
      const r = await invoke(orders.crearPedido, { mesas_id: 'otra', usuarios_id: 'u', clientes_id: null, participante_temporal: { nombre: 'Invitado' } });
      assert.equal(r.status, 201); temporalOrder = r.data.id_pedido;
      const [[row]] = await c.query('SELECT clientes_id FROM pedidos WHERE id=?', [temporalOrder]); assert.equal(row.clientes_id, null);
      const [[before]] = await c.query('SELECT COUNT(*) AS n FROM pedidos');
      assert.equal((await invoke(orders.crearPedido, { mesas_id: 'm', usuarios_id: 'u', clientes_id: null })).status, 400);
      assert.equal((await invoke(orders.crearPedido, { mesas_id: 'm', usuarios_id: 'u', clientes_id: 'inactive' })).status, 409);
      assert.equal((await c.query('SELECT COUNT(*) AS n FROM pedidos'))[0][0].n, before.n);
    });
    const add = (person, order = id) => invoke(orders.agregarItemPedido, { productos_id: 'pr', cantidad_pedida: 2, precio_unitario: 100, participante_id: person }, { id_pedido: order });
    await t.test('misma persona consolida 2+2, personas distintas no; stock adicional exacto', async () => {
      const first = await add(carlos); assert.equal(first.status, 201); assert.equal(first.data.stock_restante, 18);
      const second = await add(carlos); assert.equal(second.data.id_item, first.data.id_item); assert.equal(second.data.stock_restante, 16);
      const other = await add(laura); assert.notEqual(other.data.id_item, first.data.id_item); assert.equal(other.data.stock_restante, 14);
      const [rows] = await c.query('SELECT participante_id,cantidad_pedida FROM pedido_items WHERE pedidos_id=? ORDER BY cantidad_pedida DESC', [id]);
      assert.deepEqual(rows.map(r => [r.participante_id, r.cantidad_pedida]), [[carlos, 4], [laura, 2]]);
      assert.equal((await add(carlos, temporalOrder)).status, 409);
      assert.equal((await c.query("SELECT cantidad_disponible AS n FROM productos WHERE id='pr'"))[0][0].n, 14);
    });
    await t.test('históricos NULL siguen consolidando y consultándose', async () => {
      const first = await add(null); const second = await add(null); assert.equal(first.data.id_item, second.data.id_item);
      const r = await invoke(orders.obtenerPedidoConDetalles, {}, { id });
      assert.ok(r.data.datos.items.some(i => i.participante_id === null));
      assert.ok(r.data.datos.items.some(i => i.participante_nombre === 'Carlos'));
    });
    await t.test('migración repetida preserva jugadores e ítems', async () => {
      await ejecutarSQL(c, 'v2.38_participantes_temporales_homonimos.sql');
      await ejecutarSQL(c, 'v2.38_participantes_temporales_homonimos.sql');
      const [[legacy]] = await c.query("SELECT * FROM jugadores WHERE id='legado'"); assert.equal(legacy.pedido_id, null); assert.equal(legacy.tipo_participante, null);
      assert.equal((await c.query('SELECT COUNT(*) AS n FROM pedido_items WHERE pedidos_id=?', [id]))[0][0].n, 3);
    });
    await t.test('traslado mueve participantes sin juego conservando identidad e ítems', async () => {
      const mesas = load('mesasController.js'); const r = await invoke(mesas.trasladarMesa, { mesa_origen_id: 'm', mesa_destino_id: 'dest' });
      assert.equal(r.status, 200, JSON.stringify(r));
      const [rows] = await c.query('SELECT mesas_id FROM jugadores WHERE pedido_id=?', [id]); assert.ok(rows.every(p => p.mesas_id === 'dest'));
      assert.equal((await c.query("SELECT mesas_id FROM jugadores WHERE id='legado'"))[0][0].mesas_id, 'm');
    });
  } finally { await sandbox.close(); }
});

test('Migración de identidad preserva pedido, jugador e ítem anteriores sin asignar persona', { skip: process.env.RUN_MYSQL_PARTICIPANTES_TESTS !== '1' }, async () => {
  const sandbox = await crear({ participantes: false }), c = sandbox.connection;
  try {
    await c.query("INSERT INTO mesas(id,numero,estado) VALUES ('mesa-legada',1,'ocupada')");
    await c.query("INSERT INTO jugadores(id,nombre,mesas_id) VALUES ('persona-legada','Jugador','mesa-legada')");
    await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES ('pedido-legado','cerrado',NOW(),'mesa-legada','u','c')");
    await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES ('item-legado',100,'pedido-legado','pr',2,0,'servido','pedido-legado','pr')");
    await ejecutarSQL(c, 'v2.37_participantes_pedidos.sql');
    const [[item]] = await c.query("SELECT participante_id,cantidad_pedida,estado FROM pedido_items WHERE id='item-legado'");
    assert.equal(item.participante_id, null); assert.equal(item.cantidad_pedida, 2); assert.equal(item.estado, 'servido');
    assert.equal((await c.query("SELECT pedido_id FROM jugadores WHERE id='persona-legada'"))[0][0].pedido_id, null);
    assert.equal((await c.query("SELECT clientes_id FROM pedidos WHERE id='pedido-legado'"))[0][0].clientes_id, 'c');
  } finally { await sandbox.close(); }
});
