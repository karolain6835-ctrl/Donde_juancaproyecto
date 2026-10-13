const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Clientes: HTTP y MySQL real en tablas temporales', { skip: process.env.RUN_MYSQL_CLIENTES_TESTS !== '1' }, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const real = await require('mysql2/promise').createConnection({ host:process.env.DB_HOST,
    port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME });
  let server, fallo, cierres = 0, solicitudes = 0;
  let actor='u1', conexionesAbiertas=0;
  const conexion = {
    query: async (sql, valores) => {
      if (fallo === 'escritura' && /^(INSERT|UPDATE)/.test(sql)) throw new Error('Fallo inyectado');
      return real.query(sql, valores);
    },
    beginTransaction: () => real.beginTransaction(), rollback: () => real.rollback(),
    commit: async () => { if (fallo === 'commit') throw new Error('Fallo commit'); await real.commit(); },
    end: async () => { cierres++; }
  };
  try {
    for (const tabla of ['auditoria','clientes','usuarios']) {
      await real.query(`CREATE TEMPORARY TABLE copia_clientes_${tabla} LIKE ${tabla}`);
      await real.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_clientes_${tabla}`);
    }
    const [columnas] = await real.query('SHOW COLUMNS FROM clientes');
    assert.deepEqual(columnas.map(c => c.Field),['id','nombre','email','telefono','estado','delete_at','usuarios_id']);
    await real.query("INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id) VALUES ('u1','Usuario','clientes@example.invalid','fixture','activo',1)");
    const modulo = { exports:{} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers/clientesController.js'),'utf8'), {
      module:modulo,exports:modulo.exports,console:{ error() {} },
      require: nombre => nombre === '../config/db' ? {dbConfig:{}} : nombre === 'mysql2' ? {createConnection:()=>{conexionesAbiertas++;return {promise:()=>conexion};}} : (nombre === '../services/identidadService' ? require('../src/services/identidadService') : nombre === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : (nombre === '../services/auditoriaService' ? require('../src/services/auditoriaService') : require(nombre)))
    });
    const rutas = {exports:{}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/routes/clientesRoutes.js'),'utf8'), {
      module:rutas,require:nombre=>nombre === '../controllers/clientesController' ? modulo.exports : (nombre === '../services/identidadService' ? require('../src/services/identidadService') : nombre === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : (nombre === '../services/auditoriaService' ? require('../src/services/auditoriaService') : require(nombre)))
    });
    const express = require('express'), app = express();
    app.use(express.json()); app.use((req,res,next)=>{req.usuario={id:actor,rol:'Administrador'};next();}); app.use('/api/clientes',rutas.exports);
    server = await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base=`http://127.0.0.1:${server.address().port}/api/clientes`;
    const request=async(ruta='',metodo='GET',body)=>{
      solicitudes++;
      const r=await fetch(base+ruta,{method:metodo,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:r.status,data:await r.json()};
    };
    const body={id:'c1',nombre:'Ana Perez',email:'ana@example.invalid',telefono:'3001234567'};
    const crear=async(datos=body)=>{const r=await request('/registrar','POST',datos);assert.equal(r.status,201,JSON.stringify(r.data));return r.data.cliente;};
    const reset=async()=>{fallo=null;await real.query('DELETE FROM clientes');};
    await t.test('listado vacio y contrato',async()=>{
      const r=await request(); assert.equal(r.status,200);
      assert.deepEqual(r.data,{mensaje:'Clientes consultados correctamente.',pagina:1,limite:20,total:0,datos:[]});
    });
    await t.test('creacion valida y persistencia tras commit',async()=>{
      const cliente=await crear(); assert.equal(cliente.estado,'activo');assert.equal(cliente.delete_at,null);
      assert.equal(cliente.nombre,body.nombre);assert.equal(cliente.usuarios_id,'u1');
      const [[fila]]=await real.query("SELECT * FROM clientes WHERE id='c1'");assert.equal(fila.email,body.email);
      assert.equal('puntos' in cliente,false);
    });
    await t.test('sin email, telefono y generacion UUID',async()=>{
      const cliente=await crear({nombre:'Luis'});
      assert.match(cliente.id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.equal(cliente.email,null);assert.equal(cliente.telefono,null);
    });
    await t.test('listado, filtros, busquedas y paginacion',async()=>{
      await reset();await crear();await crear({...body,id:'c2',nombre:'Bruno',email:'bruno@example.invalid',telefono:'3119999999'});
      assert.equal((await request('/c2','PUT',{estado:'inactivo'})).status,200);
      assert.equal((await request()).data.total,2);
      assert.equal((await request('?estado=inactivo')).data.datos[0].id,'c2');
      for(const buscar of ['Ana','ana@example','300123']) {
        const r=await request(`?buscar=${encodeURIComponent(buscar)}`);assert.equal(r.data.total,1);assert.equal(r.data.datos[0].id,'c1');
      }
      const r=await request('?pagina=2&limite=1');assert.equal(r.data.pagina,2);assert.equal(r.data.limite,1);assert.equal(r.data.total,2);assert.equal(r.data.datos[0].id,'c2');
      assert.equal((await request('?estado=activo&buscar=Bruno')).data.total,0);
      assert.equal((await request('?buscar=%25')).data.total,0);
    });
    for(const query of ['limite=0','limite=101','limite=1.5','limite=abc','pagina=0','pagina=-1','pagina=1.5','estado=otro','buscar=','limite=1&limite=2']) {
      await t.test(`query invalida ${query}`,async()=>assert.equal((await request(`?${query}`)).status,400));
    }
    await t.test('consulta existente y 404',async()=>{
      assert.equal((await request('/c1')).data.cliente.id,'c1');assert.equal((await request('/no-existe')).status,404);
    });
    await t.test('usuario inexistente y email duplicado',async()=>{
      assert.equal((await request('/registrar','POST',{...body,id:'c3',usuarios_id:'no-existe'})).status,400);
      assert.equal((await request('/registrar','POST',{...body,id:'c3'})).status,409);
      assert.equal((await request('/registrar','POST',{...body,id:'c3',email:'ANA@example.invalid'})).status,409);
      assert.equal((await request('/registrar','POST',{...body,email:'otro@example.invalid'})).status,409);
    });
    for(const cambio of [{nombre:''},{nombre:' '},{nombre:'a'.repeat(101)},{nombre:123},{usuarios_id:null},{id:123},{id:'x'.repeat(37)},{email:'invalido'},{email:'a'.repeat(151)},{telefono:'1'.repeat(21)},{telefono:123}]) {
      await t.test(`creacion invalida ${JSON.stringify(cambio).slice(0,55)}`,async()=>assert.equal((await request('/registrar','POST',{...body,...cambio})).status,400));
    }
    for(const campo of ['puntos','documento','tipo_cliente','direccion','estado','delete_at','extra']) {
      await t.test(`campo adicional ${campo}`,async()=>assert.equal((await request('/registrar','POST',{...body,[campo]:'valor'})).status,400));
    }
    await t.test('nombre y usuario obligatorios',async()=>{
      for(const campo of ['nombre']) {const b={...body};delete b[campo];assert.equal((await request('/registrar','POST',b)).status,400);}
    });
    await t.test('actualizacion, desactivacion, reactivacion y nullable',async()=>{
      const r=await request('/c1','PUT',{nombre:'Ana Nueva',email:null,telefono:null,estado:'inactivo'});
      assert.equal(r.status,200);assert.equal(r.data.cliente.nombre,'Ana Nueva');assert.equal(r.data.cliente.email,null);assert.equal(r.data.cliente.telefono,null);
      assert.equal(r.data.cliente.usuarios_id,'u1');assert.equal(r.data.cliente.delete_at,null);
      assert.equal((await request('/c1','PUT',{estado:'activo'})).data.cliente.estado,'activo');
      assert.equal((await request('/c1','PUT',{estado:'activo'})).status,200,'Mismo valor sigue siendo valido');
    });
    await t.test('email duplicado al actualizar y propio permitido',async()=>{
      assert.equal((await request('/c1','PUT',{email:'bruno@example.invalid'})).status,409);
      assert.equal((await request('/c2','PUT',{email:'bruno@example.invalid'})).status,200);
    });
    await t.test('PUT vacio, inexistente, campos protegidos y valores invalidos',async()=>{
      assert.equal((await request('/c1','PUT',{})).status,400);
      assert.equal((await request('/no-existe','PUT',{nombre:'Otro'})).status,404);
      for(const b of [{usuarios_id:'u1'},{delete_at:null},{id:'c9'},{estado:'bloqueado'},{nombre:null},{email:'mal'},{telefono:12}]) assert.equal((await request('/c1','PUT',b)).status,400);
    });
    for(const tipo of ['escritura','commit']) await t.test(`error interno ${tipo} revierte y libera`,async()=>{
      await reset();fallo=tipo;assert.equal((await request('/registrar','POST',body)).status,500);
      const [[r]]=await real.query('SELECT COUNT(*) AS total FROM clientes');assert.equal(r.total,0);
      fallo=null;await crear();fallo=tipo;assert.equal((await request('/c1','PUT',{nombre:'Cambio'})).status,500);
      const [[c]]=await real.query("SELECT nombre FROM clientes WHERE id='c1'");assert.equal(c.nombre,'Ana Perez');
    });
    assert.equal(cierres,conexionesAbiertas);
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    await real.end();
  }
});
