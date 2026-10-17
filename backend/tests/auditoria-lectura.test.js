const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const express=require('express'),jwt=require('jsonwebtoken');
const servicio=require('../src/services/auditoriaLecturaService');
test('Auditoría: filtros estrictos y detalle seguro recursivo',()=>{
 for(const q of [{limite:'101'},{pagina:'0'},{pagina:['1','2']},{fecha_desde:'2026-02-30'},{fecha_desde:'2026-10-17',fecha_hasta:'2026-10-16'},{usuario:{id:1}},{accion:'x'.repeat(101)},{usuarios_id:'suplantado'}])assert.throws(()=>servicio.filtros(q));
 const r=servicio.detalleSeguro({antes:{estado:'activo',password:'NO',password_hash:'NO',nombre:'NO'},despues:{estado:'inactivo',jwt:'NO',otp:'NO'},items:[{cantidad:2,headers:{authorization:'NO'},token_id:'NO'}],motivo:'password=NO',snapshot:{api_key:'NO'}});
 assert.deepEqual(r.detalle,{antes:{estado:'activo'},despues:{estado:'inactivo'},items:[{cantidad:2}]});assert.equal(r.detalle_omitido,true);assert.equal(JSON.stringify(r).includes('NO'),false);
 assert.deepEqual(servicio.detalleSeguro('invalid-json'),{detalle:{},detalle_omitido:true});
});
test('Auditoría real: Express/JWT y tablas temporales MySQL',{skip:process.env.RUN_MYSQL_AUDITORIA_LECTURA_TESTS!=='1'},async t=>{
 require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
 const c=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 const previo=process.env.JWT_SECRET;process.env.JWT_SECRET='auditoria-lectura-secreto-exclusivo-pruebas-123456789';let server;
 const db={dbConfig:{},promise:()=>({query:(s,p)=>c.query(s,p)})};
 const load=(file,deps)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module:m,exports:m.exports,process,Buffer,console,require:n=>Object.hasOwn(deps,n)?deps[n]:require(n)});return m.exports;};
 try{
  for(const table of ['roles','usuarios','auditoria']){await c.query(`CREATE TEMPORARY TABLE copia_lectura_${table} LIKE ${table}`);await c.query(`CREATE TEMPORARY TABLE ${table} LIKE copia_lectura_${table}`);}
  const roles=['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero'];
  for(let i=0;i<roles.length;i++){await c.query('INSERT INTO roles(id,nombre) VALUES (?,?)',[i+1,roles[i]]);await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'no-login','activo',?)",['u'+i,roles[i],'u'+i+'@example.invalid',i+1]);}
  const secreto={antes:{estado:'activo',contrasena:'CLAVE-PRIVADA',password_hash:'HASH-PRIVADO',headers:{authorization:'BEARER-PRIVADO'}},despues:{estado:'inactivo',token:'TOKEN-PRIVADO',otp:'OTP-PRIVADO'},items:[{cantidad:2,api_key:'API-PRIVADA'}]};
  for(const e of [['a','2026-10-16 00:00:00','u0','inventario','ajuste_stock','productos'],['b','2026-10-16 23:59:59','u1','pagos','pago_verificado','pagos'],['c','2026-10-17 00:00:00','u0','pagos','pago_verificado','pagos'],['d','2026-10-16 23:59:59','u0','inventario','ajuste_stock','productos']])await c.query("INSERT INTO auditoria(id,creado_en,usuarios_id,categoria,tipo_evento,entidad,entidad_id,cambios_json,resultado) VALUES (?,?,?,?,?,?,'referencia',?,'exitoso')",[...e,JSON.stringify(secreto)]);
  const auth=load('../src/middleware/authMiddleware.js',{'../config/db':db});
  const controller=load('../src/controllers/auditoriaController.js',{'../config/db':db,'../services/auditoriaLecturaService':servicio,mysql2:{createConnection:()=>({promise:()=>({query:(s,p)=>c.query(s,p),beginTransaction:()=>c.beginTransaction(),commit:()=>c.commit(),rollback:()=>c.rollback(),end:async()=>{}})})}});
  const router=load('../src/routes/auditoriaRoutes.js',{'../controllers/auditoriaController':controller,'../middleware/rolesMiddleware':require('../src/middleware/rolesMiddleware')});
  // Ejecutar index real; routers ajenos son inertes para evitar escrituras fuera de tablas temporales.
  const app=express(),listen=app.listen.bind(app);app.listen=()=>{};
  const deps={express:Object.assign(()=>app,{json:express.json}),cors:()=>((req,res,next)=>next()),dotenv:{config(){}},'./config/db':db,'./middleware/authMiddleware':auth,'./routes/auditoriaRoutes':router};
  for(const [,ruta]of fs.readFileSync(path.join(__dirname,'../src/index.js'),'utf8').matchAll(/require\('(\.\/routes\/[^']+)'\)/g))if(!deps[ruta])deps[ruta]=express.Router();
  deps['./middleware/errorMiddleware']=require('../src/middleware/errorMiddleware');
  load('../src/index.js',deps);server=await new Promise(resolve=>{const s=listen(0,'127.0.0.1',()=>resolve(s));});
  const req=async(query='',rol=0,autenticado=true)=>{const token=jwt.sign({rol:'ignorado'},process.env.JWT_SECRET,{issuer:'dondejuanca',subject:'u'+rol,expiresIn:3600});const r=await fetch(`http://127.0.0.1:${server.address().port}/api/auditoria${query}`,{headers:autenticado?{Authorization:'Bearer '+token}:{}});return {status:r.status,data:await r.json()};};
  await t.test('listado paginado y orden descendente estable',async()=>{const r=await req('?limite=2');assert.equal(r.status,200);assert.deepEqual(r.data.datos.map(e=>e.id),['c','d']);assert.deepEqual(r.data.paginacion,{pagina:1,limite:2,total:4,total_paginas:2});assert.equal(r.data.datos[0].usuario_nombre,'Administrador');assert.deepEqual((await req('?pagina=2&limite=2')).data.datos.map(e=>e.id),['b','a']);});
  await t.test('fechas: desde inclusivo y hasta incluye 23:59:59, excluye día siguiente',async()=>{const r=await req('?fecha_desde=2026-10-16&fecha_hasta=2026-10-16');assert.deepEqual(r.data.datos.map(e=>e.id),['d','b','a']);});
  await t.test('filtros usuario, acción, módulo y entidad reales; SQL parametrizado',async()=>{
   assert.equal((await req('?usuario=u1')).data.paginacion.total,1);assert.equal((await req('?accion=pago_verificado&modulo=pagos&entidad=pagos')).data.paginacion.total,2);assert.equal((await req('?accion='+encodeURIComponent("' OR 1=1 --"))).data.paginacion.total,0);
  });
  await t.test('sin secretos, credenciales ni JSON original',async()=>{const r=await req();const str=JSON.stringify(r.data);for(const token of ['CLAVE-PRIVADA','HASH-PRIVADO','TOKEN-PRIVADO','OTP-PRIVADO','BEARER-PRIVADO','API-PRIVADA','password_hash','cambios_json'])assert.equal(str.includes(token),false,token);assert.equal(r.data.datos[0].detalle.antes.estado,'activo');assert.equal(r.data.datos[0].detalle.items[0].cantidad,2);assert.equal(r.data.datos[0].detalle_omitido,true);});
  await t.test('JWT obligatorio; solo administradores; inválidos 400 y vacío 200',async()=>{
   assert.equal((await req('',0,false)).status,401);for(let i=0;i<roles.length;i++)assert.equal((await req('',i)).status,i<2?200:403);
   for(const q of ['?pagina=0','?limite=101','?fecha_hasta=2026-02-30','?usuario=x&usuario=y','?usuarios_id=u1'])assert.equal((await req(q)).status,400);
   assert.deepEqual((await req('?usuario=no-existe')).data.datos,[]);
  });
 }finally{if(server)await new Promise(r=>server.close(r));await c.end();if(previo===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previo;}
});
