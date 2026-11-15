const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const mysql = require('mysql2');
const express = require('express');

function loadDb(driver = mysql, env = {}) {
  const m = {exports: {}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/config/db.js'), 'utf8'), {
    module: m, process: {env}, require: name => name === 'mysql2' ? driver : name === 'dotenv' ? {config(){}} : name === 'node:timers' ? require(name) : {registrarError(){}}
  });
  return m.exports;
}

async function fixture(t, options = {}) {
  const sockets = new Set(), queries = [];
  const server = mysql.createServer();
  server.on('connection', c => {
    sockets.add(c); c.on('error', () => {});
    c.stream.on('close', () => sockets.delete(c));
    if (options.stallHandshake) return;
    c.serverHandshake({protocolVersion:10,serverVersion:'5.5.5-10.11.0-MariaDB',connectionId:1,statusFlags:2,characterSet:45,capabilityFlags:0x00088200,authCallback:(_,done)=>{done();c.sequenceId=0;}});
    const ok = () => { c.sequenceId=1;c.writeOk({affectedRows:1});c.sequenceId=0; };
    c.on('stmt_prepare', ok);
    c.on('quit',()=>c.stream.end());
    c.on('query', sql => {
      queries.push(sql);
      if (sql === 'HANG') return;
      if (sql === 'DROP' || sql === 'COMMIT' && fixture.failCommit) return c.stream.destroy();
      ok();
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const driver = options.connectTimeout ? {...mysql,createPool:config=>mysql.createPool({...config,connectTimeout:options.connectTimeout})} : mysql;
  const db = loadDb(driver, {DB_HOST:'127.0.0.1',DB_PORT:server._server.address().port,DB_USER:'test',DB_NAME:'test'});
  t.after(async () => {
    fixture.failCommit = false;
    for (const c of sockets) c.stream.destroy();
    await db.promise().end();
    await new Promise(resolve => server.close(resolve));
  });
  return {db,sockets,queries};
}

test('Pool: callback y promise compatibles; idle ECONNRESET no termina proceso y la siguiente consulta usa otra conexión', async t => {
  const {db,sockets} = await fixture(t);
  await new Promise((resolve,reject) => db.query('SELECT 1', e => e ? reject(e) : resolve()));
  const old = [...sockets][0];
  const lost = new Promise(resolve => db._allConnections.get(0).once('error', resolve));
  old.stream.resetAndDestroy();
  await lost;
  await db.promise().query('SELECT 2');
  assert.ok([...sockets].some(c => c !== old));
});

test('Pool: pérdida durante escritura rechaza una sola vez sin reintentar; solicitudes posteriores funcionan', async t => {
  const {db,queries} = await fixture(t);
  await assert.rejects(db.promise().query('DROP'), e => ['PROTOCOL_CONNECTION_LOST','ECONNRESET'].includes(e.code));
  await db.promise().query('SELECT 1');
  assert.equal(queries.filter(s => s === 'DROP').length, 1);
});

test('Pool: timeout descarta socket y no repite una operación', async t => {
  const {db,queries} = await fixture(t);
  await assert.rejects(db.promise().query({sql:'HANG',timeout:30}), {code:'PROTOCOL_SEQUENCE_TIMEOUT'});
  await db.promise().query('SELECT 1');
  assert.equal(queries.filter(s => s === 'HANG').length, 1);
});

test('Pool: misma conexión en transacción, liberación idempotente y rollback SQL explícito', async t => {
  const {db} = await fixture(t);
  const c = await db.acquire(), id = c.threadId;
  await c.beginTransaction(); await c.query('INSERT venta'); await c.commit();
  assert.equal(c.threadId,id); c.release(); c.release();
  const next = await db.acquire();
  assert.equal(next.connection,c.connection);
  await next.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  await next.rollback(); next.release();
  assert.equal(db._freeConnections.length,1);
});

test('Pool: transacción sin cerrar o rollback fallido nunca vuelve al pool', async t => {
  const {db} = await fixture(t);
  const c = await db.acquire(); await c.beginTransaction(); c.release();
  assert.equal(db._allConnections.length,0);
  const next = await db.acquire(); await next.beginTransaction();
  await assert.rejects(next.query('DROP'));
  await assert.rejects(next.rollback()); next.release();
  assert.equal(db._allConnections.length,0);
});

test('Pool: commit interrumpido no se repite y se descarta la conexión', async t => {
  const {db,queries} = await fixture(t);
  const c = await db.acquire(); await c.beginTransaction(); await c.query('INSERT pago');
  fixture.failCommit = true;
  await assert.rejects(c.commit()); c.release();
  assert.equal(queries.filter(s => s === 'INSERT pago').length,1);
  assert.equal(queries.filter(s => s === 'COMMIT').length,1);
  assert.equal(db._allConnections.length,0);
});

test('Pool: saturación falla inmediatamente y el pool continúa al liberar', async t => {
  const {db} = await fixture(t), connections = [];
  for(let i=0;i<10;i++)connections.push(await db.acquire());
  await assert.rejects(db.acquire(), /No connections available/);
  for(const c of connections)c.release();
  await db.promise().query('SELECT 1');
  assert.equal(db._allConnections.length,10);
});

test('Salud HTTP: 200/503, SELECT acotado y respuesta sin secretos', async () => {
  let failure=false, calls=0;
  const m={exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers/healthController.js'),'utf8'), {
    module:m,require:name=>name==='../config/db'?{promise:()=>({query:async options=>{
      calls++;assert.equal(options.sql,'SELECT 1');assert.equal(options.timeout,5000);
      if(failure)throw Error('password=secreto');
    }})}:{registrarError(){}}
  });
  const app=express();app.get('/api/health',async (req,res)=>{await m.exports(req,res);});
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  try{
    for(const down of [false,true,false]){
      failure=down;const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/health');
      assert.equal(r.status,down?503:200);assert.equal(r.headers.get('cache-control'),'no-store');
      assert.deepEqual(await r.json(),{status:down?'unavailable':'ok',api:'up',database:down?'down':'up'});
    }
    assert.equal(calls,3);
  }finally{await new Promise(resolve=>server.close(resolve));}
});


test('Pool: timeout al conectar rechaza, retira socket y permite una nueva conexi?n', async t => {
  const options={stallHandshake:true,connectTimeout:50};
  const {db}=await fixture(t,options);
  await assert.rejects(db.promise().query('SELECT 1'),{code:'ETIMEDOUT'});
  assert.equal(db._allConnections.length,0);
  options.stallHandshake=false;
  await db.promise().query('SELECT 1');
});
