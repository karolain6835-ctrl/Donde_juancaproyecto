const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const mysql = require('mysql2/promise');

// Pruebas optativas contra MySQL: solo escriben tablas TEMPORARY de esta conexión.
test('pagos y liquidación con MySQL y tablas temporales', {
  skip: process.env.RUN_MYSQL_PAYMENT_TESTS !== '1'
}, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const real = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, connectTimeout: 5000
  });
  let fallar = null;
  let falloCommit = false;
  let importeInsertado;
  const conexion = {
    beginTransaction: () => real.beginTransaction(),
    query: async (sql, params) => {
      if (sql.includes('INSERT INTO pagos')) importeInsertado = params[2];
      if (fallar && sql.includes(fallar)) throw new Error('Fallo inyectado para probar rollback');
      return real.query(sql, params);
    },
    commit: async () => {
      if (falloCommit) throw new Error('Fallo de commit inyectado');
      return real.commit();
    },
    rollback: () => real.rollback(),
    end: async () => {}
  };
  const modulo = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/pagosController.js'), 'utf8'), {
    module: modulo,
    exports: modulo.exports,
    require: nombre => {
      if (nombre === '../config/db') return { dbConfig: {} };
      if (nombre === 'mysql2') return { createConnection: () => ({ promise: () => conexion }) };
      if (nombre === '../services/liquidacionService') return require('../src/services/liquidacionService');
      return (nombre === '../services/identidadService' ? require('../src/services/identidadService') : nombre === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : (nombre === '../services/auditoriaService' ? require('../src/services/auditoriaService') : require(nombre)));
    },
    console: { error() {} }
  });
  const api = modulo.exports;
  const invocar = async (handler, body, params = {}) => {
    let respuesta;
    await handler({ body, params, usuario: {id:'test-usuario'} }, {
      status(status) { this.codigo = status; return this; },
      json(data) { respuesta = { status: this.codigo, data: JSON.parse(JSON.stringify(data)) }; }
    });
    return respuesta;
  };
  const registrar = (id, importe, extra = {}) => invocar(api.registrarPago, {
    id, metodo_de_pago: 'efectivo', total_seleccionado: importe,
    pedidos_id: 'test-pedido', ...extra
  });
  const verificar = (id, decision = 'verificado') => invocar(api.verificarPago,
    { verificacion_estado: decision }, { id });
  const tablas = ['auditoria', 'mesas', 'pedidos', 'pedido_items', 'pagos', 'sesiones_juego',
    'sesiones_division_cuentas', 'division_participantes'];
  const preparar = async () => {
    fallar = null;
    falloCommit = false;
    for (const tabla of tablas) await real.query(`DELETE FROM ${tabla}`);
    await real.query("INSERT INTO mesas (id,numero,estado,creado_en) VALUES ('test-mesa',999,'ocupada',NOW())");
    await real.query(`INSERT INTO pedidos (id,estado,creado_en,mesas_id,usuarios_id,clientes_id)
      VALUES ('test-pedido','abierto',NOW(),'test-mesa','test-usuario','test-cliente')`);
    await real.query(`INSERT INTO pedido_items
      (id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id)
      VALUES ('test-item',100,'test-pedido','test-producto',10,0,'servido','test-pedido','test-producto')`);
  };
  const juego = (estado, costo) => real.query(`INSERT INTO sesiones_juego
    (id,tipo_juego,costo_total,estado,activos_juego_id,mesas_id,iniciada_por,cerrada_por,pedido_items_id)
    VALUES ('test-juego','billar',?,?,'test-activo','test-mesa','test-usuario','test-usuario','test-item')`, [costo, estado]);
  try {
    // Crear todas las copias antes de habilitar DELETE/UPDATE para evitar tocar tablas reales.
    for (const tabla of tablas) {
      await real.query(`CREATE TEMPORARY TABLE copia_${tabla} LIKE ${tabla}`);
      await real.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_${tabla}`);
    }
    await require('./helpers/participantesTemporales')(real, { pedidos: true });
    await t.test('pendiente, parcial, final, cantidades e idempotencia', async () => {
      await preparar();
      let r = await registrar('test-p1', 400);
      assert.equal(r.status, 201);
      const [[registrado]]=await real.query("SELECT usuarios_id FROM pagos WHERE id='test-p1'");assert.equal(registrado.usuarios_id,'test-usuario');
      assert.equal(r.data.liquidacion.total_pagado, '0.00');
      assert.equal(r.data.liquidacion.saldo_pendiente, '1000.00');
      assert.equal(r.data.liquidacion.estado_mesa, 'en_cobro');
      r = await verificar('test-p1');
      assert.equal(r.data.liquidacion.saldo_pendiente, '600.00');
      assert.equal(r.data.liquidacion.cuenta_liquidada, false);
      assert.equal((await registrar('test-p1', 400)).status, 409);
      assert.equal((await registrar('test-exceso', 601)).status, 409);
      assert.equal((await registrar('test-p2', 600)).status, 201);
      r = await verificar('test-p2');
      assert.equal(r.status, 200);
      assert.equal(r.data.liquidacion.total_pagado, '1000.00');
      assert.equal(r.data.liquidacion.cuenta_liquidada, true);
      assert.equal(r.data.liquidacion.estado_pedido, 'cerrado');
      assert.equal(r.data.liquidacion.estado_mesa, 'disponible');
      const [[item]] = await real.query("SELECT cantidad_pagada FROM pedido_items WHERE id='test-item'");
      assert.equal(item.cantidad_pagada, 10);
      assert.deepEqual((await verificar('test-p2')).data, r.data);
      assert.equal((await registrar('test-p3', 1)).status, 409);
      assert.equal((await verificar('test-p2', 'rechazado')).status, 409);
    });
    await t.test('reservas pendientes y rechazo no cuentan como dinero pagado', async () => {
      await preparar();
      await registrar('test-p1', 700);
      assert.equal((await registrar('test-p2', 400)).status, 409);
      const r = await verificar('test-p1', 'rechazado');
      assert.equal(r.data.liquidacion.total_pagado, '0.00');
      assert.equal(r.data.liquidacion.pagos_pendientes_verificacion, '0.00');
      assert.equal((await registrar('test-p2', 1000)).status, 201);
    });
    await t.test('juegos activos y costos desconocidos impiden un cierre prematuro', async () => {
      await preparar(); await juego('activa', null);
      await registrar('test-p1', 1000);
      let r = await verificar('test-p1');
      assert.equal(r.data.liquidacion.saldo_pendiente, '0.00');
      assert.equal(r.data.liquidacion.total_definitivo, false);
      assert.equal(r.data.liquidacion.cuenta_liquidada, false);
      await real.query("UPDATE sesiones_juego SET estado='cerrada', costo_total=150 WHERE id='test-juego'");
      assert.equal((await registrar('test-p2', 151)).status, 409);
      await registrar('test-p2', 150);
      r = await verificar('test-p2');
      assert.equal(r.data.liquidacion.total_cuenta, '1150.00');
      assert.equal(r.data.liquidacion.cuenta_liquidada, true);
    });
    await t.test('otro pedido abierto conserva la mesa en cobro', async () => {
      await preparar();
      await real.query(`INSERT INTO pedidos (id,estado,creado_en,mesas_id,usuarios_id,clientes_id)
        VALUES ('test-otro','abierto',NOW(),'test-mesa','test-usuario','test-cliente')`);
      await registrar('test-p1', 1000);
      const r = await verificar('test-p1');
      assert.equal(r.data.liquidacion.cuenta_liquidada, true);
      assert.equal(r.data.liquidacion.estado_mesa, 'en_cobro');
    });
    const [columnasPagos] = await real.query('SHOW COLUMNS FROM pagos');
    assert.equal(columnasPagos.find(c => c.Field === 'total_seleccionado').Type, 'decimal(12,2)', 'Se requiere v2.24 aplicada');
    await t.test('importe exacto en centavos y deuda fraccionaria', async () => {
      await preparar();
      await real.query("UPDATE pedido_items SET precio_unitario=100.05 WHERE id='test-item'");
      await registrar('test-p1', 1000);
      const r = await verificar('test-p1');
      assert.equal(r.data.liquidacion.saldo_pendiente, '0.50');
      assert.equal(r.data.liquidacion.cuenta_liquidada, false);
      assert.equal((await registrar('test-p2', 1)).status, 409);
      assert.equal((await registrar('test-exceso', '0.51')).status, 409);
      const pendiente = await registrar('test-p2', 0.50);
      assert.equal(pendiente.status, 201);
      assert.equal(pendiente.data.liquidacion.saldo_pendiente, '0.50');
      const final = await verificar('test-p2');
      assert.equal(final.data.liquidacion.saldo_pendiente, '0.00');
      assert.equal(final.data.liquidacion.cuenta_liquidada, true);
    });
    for (const valor of [15000, '15000.00', 1000.50, '1000.50', 0.50, 0.01]) {
      await t.test(`importe aceptado ${JSON.stringify(valor)}`, async () => {
        await preparar();
        await real.query("UPDATE pedido_items SET precio_unitario=2000 WHERE id='test-item'");
        const r = await registrar('test-decimal', valor);
        assert.equal(r.status, 201);
        assert.equal(typeof importeInsertado, 'string');
        assert.match(importeInsertado, /^\d+\.\d{2}$/);
        const [[p]] = await real.query("SELECT total_seleccionado FROM pagos WHERE id='test-decimal'");
        assert.equal(p.total_seleccionado, importeInsertado);
        assert.equal(r.data.liquidacion.total_pagado, '0.00');
        assert.equal(r.data.liquidacion.saldo_pendiente, '20000.00');
      });
    }
    for (const valor of [0, -1, 1.001, '1.001', '1e3', true, false, null, '', ' ', 'abc', '10000000000', '9999999999.999', [], {}]) {
      await t.test(`importe rechazado ${JSON.stringify(valor)}`, async () => {
        await preparar();
        assert.equal((await registrar('test-invalido', valor)).status, 400);
        const [[r]] = await real.query('SELECT COUNT(*) AS n FROM pagos');
        assert.equal(r.n, 0);
      });
    }
    await t.test('limite DECIMAL(12,2) valido se rechaza por saldo, no por formato', async () => {
      await preparar();
      assert.equal((await registrar('test-maximo', '9999999999.99')).status, 409);
    });
    await t.test('1000.50 liquida exactamente tras verificacion', async () => {
      await preparar();
      await real.query("UPDATE pedido_items SET precio_unitario=100.05 WHERE id='test-item'");
      assert.equal((await registrar('test-fraccion', '1000.50')).status, 201);
      const r = await verificar('test-fraccion');
      assert.equal(r.data.liquidacion.total_pagado, '1000.50');
      assert.equal(r.data.liquidacion.cuenta_liquidada, true);
    });
    await t.test('division fraccionaria y exceso con centavos', async () => {
      await preparar();
      await real.query(`INSERT INTO sesiones_division_cuentas (id,modalidad,usuarios_id,mesas_id)
        VALUES ('test-division','items','test-usuario','test-mesa')`);
      await real.query(`INSERT INTO division_participantes (id,sesion_division_id,nombre_cliente,total_asignado)
        VALUES ('test-part','test-division','Prueba',0.51)`);
      const extra = {sesion_division_id:'test-division',participante_id:'test-part'};
      assert.equal((await registrar('test-exceso', '0.52', extra)).status, 409);
      assert.equal((await registrar('test-centavo', '0.01', extra)).status, 201);
      await verificar('test-centavo');
      assert.equal((await registrar('test-resto', '0.50', extra)).status, 201);
      await verificar('test-resto');
      const [[p]] = await real.query("SELECT estado FROM division_participantes WHERE id='test-part'");
      assert.equal(p.estado, 'pagado');
    });
    for (const tipo of ['insert', 'update', 'commit']) {
      await t.test(`rollback registro fraccionario ${tipo}`, async () => {
        await preparar();
        fallar = tipo === 'insert' ? 'INSERT INTO pagos' : tipo === 'update' ? 'UPDATE mesas' : null;
        falloCommit = tipo === 'commit';
        assert.equal((await registrar('test-fraccion', '0.50')).status, 500);
        const [[p]] = await real.query('SELECT COUNT(*) AS n FROM pagos');
        const [[pedido]] = await real.query("SELECT estado,total_general FROM pedidos WHERE id='test-pedido'");
        const [[mesa]] = await real.query("SELECT estado FROM mesas WHERE id='test-mesa'");
        assert.equal(p.n, 0); assert.equal(pedido.estado, 'abierto');
        assert.equal(pedido.total_general, '0.00'); assert.equal(mesa.estado, 'ocupada');
      });
    }
    await t.test('participante: límites y actualización del estado', async () => {
      await preparar();
      await real.query(`INSERT INTO sesiones_division_cuentas (id,modalidad,usuarios_id,mesas_id)
        VALUES ('test-division','items','test-usuario','test-mesa')`);
      await real.query(`INSERT INTO division_participantes (id,sesion_division_id,nombre_cliente,total_asignado)
        VALUES ('test-part','test-division','Prueba',400)`);
      const extra = { sesion_division_id: 'test-division', participante_id: 'test-part' };
      assert.equal((await registrar('test-exceso', 401, extra)).status, 409);
      assert.equal((await registrar('test-p1', 400, extra)).status, 201);
      assert.equal((await verificar('test-p1')).status, 200);
      const [[p]] = await real.query("SELECT estado FROM division_participantes WHERE id='test-part'");
      assert.equal(p.estado, 'pagado');
    });
    await t.test('fecha UTC en primera verificacion; repeticion conserva exactamente la fecha', async () => {
      await preparar();
      await registrar('test-fecha', '1000.00');
      const leer = async () => {
        const [[p]] = await real.query(`SELECT estado,verificacion_estado,
          DATE_FORMAT(verificado_en,'%Y-%m-%d %H:%i:%s') AS fecha,
          ABS(TIMESTAMPDIFF(SECOND,verificado_en,UTC_TIMESTAMP())) AS antiguedad
          FROM pagos WHERE id='test-fecha'`);
        return p;
      };
      assert.equal((await leer()).fecha, null);
      assert.equal((await verificar('test-fecha')).status, 200);
      const primera = await leer();
      assert.match(primera.fecha, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      assert.ok(primera.antiguedad <= 5);
      // Garantizar que UTC_TIMESTAMP() sea distinto al repetir, sin depender de sleeps.
      await real.query("UPDATE pagos SET verificado_en=UTC_TIMESTAMP()-INTERVAL 1 DAY WHERE id='test-fecha'");
      const antes = await leer();
      assert.equal((await verificar('test-fecha')).status, 200);
      assert.equal((await leer()).fecha, antes.fecha);
    });
    await t.test('rechazo mantiene fecha NULL incluso al repetir', async () => {
      await preparar(); await registrar('test-rechazo', '0.50');
      for (let i=0; i<2; i++) {
        assert.equal((await verificar('test-rechazo', 'rechazado')).status, 200);
        const [[p]] = await real.query("SELECT verificado_en FROM pagos WHERE id='test-rechazo'");
        assert.equal(p.verificado_en, null);
      }
    });
    await t.test('pago historico verificado sin fecha no recibe backfill', async () => {
      await preparar(); await registrar('test-historico', '0.50');
      await real.query("UPDATE pagos SET estado='pagado',verificacion_estado='verificado',verificado_en=NULL WHERE id='test-historico'");
      assert.equal((await verificar('test-historico')).status, 200);
      const [[p]] = await real.query("SELECT verificado_en FROM pagos WHERE id='test-historico'");
      assert.equal(p.verificado_en, null);
    });
    await t.test('rollback de registro y de verificación tras fallo SQL o commit', async () => {
      await preparar();
      fallar = 'UPDATE mesas';
      assert.equal((await registrar('test-p1', 1000)).status, 500);
      const [[cantidad]] = await real.query('SELECT COUNT(*) AS n FROM pagos');
      assert.equal(cantidad.n, 0);
      fallar = null;
      await registrar('test-p1', 1000);
      for (const tipo of ['sql', 'commit']) {
        fallar = tipo === 'sql' ? 'UPDATE mesas' : null;
        falloCommit = tipo === 'commit';
        assert.equal((await verificar('test-p1')).status, 500);
        const [[p]] = await real.query("SELECT estado,verificado_en FROM pagos WHERE id='test-p1'");
        const [[pedido]] = await real.query("SELECT estado FROM pedidos WHERE id='test-pedido'");
        assert.equal(p.estado, 'pendiente');
        assert.equal(p.verificado_en, null);
        assert.equal(pedido.estado, 'abierto');
      }
    });
  } finally {
    await real.end();
  }
});
