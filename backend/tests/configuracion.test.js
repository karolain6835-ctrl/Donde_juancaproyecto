const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const servicio=require('../src/services/configuracionService');
const empty={nombreNegocio:null,nit:null,telefono:null,email:null,direccion:null,horaApertura:null,horaCierre:null,impuesto:null,moneda:'COP'};
test('Configuracion valida campos vacios, horarios nocturnos y porcentaje; rechaza datos invalidos',()=>{
 assert.deepEqual(servicio.validar(empty),empty);
 assert.equal(servicio.validar({...empty,horaApertura:'10:00',horaCierre:'02:00',impuesto:'19.25'}).impuesto,'19.25');
 for(const bad of [{email:'mal'},{telefono:'abc'},{horaApertura:'24:00'},{impuesto:-1},{impuesto:101},{impuesto:'1.001'},{moneda:'USD'},{nombreNegocio:'x'.repeat(151)},{actualizado_por:'suplantado'}])assert.throws(()=>servicio.validar({...empty,...bad}),e=>e.status===400);
});
test('Configuracion: HTTP real JWT, persistencia MySQL temporal, auditoria y rollback',{skip:process.env.RUN_MYSQL_CONFIGURACION_TESTS!=='1'},async t=>{
 require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
 const c=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 const express=require('express'),jwt=require('jsonwebtoken');let server,fallar=false;const old=process.env.JWT_SECRET;process.env.JWT_SECRET='configuracion-test-secreto-exclusivo-1234567890';
 const load=(file,deps)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module:m,exports:m.exports,process,Buffer,console,require:n=>Object.hasOwn(deps,n)?deps[n]:require(n)});return m.exports;};
 const query=async(s,p)=>{if(fallar&&s.includes('INSERT INTO auditoria'))throw new Error('Fallo auditoria');return c.query(s,p);};
 const db={dbConfig:{},promise:()=>({query})};
 try{
  for(const table of ['usuarios','roles','auditoria','configuracion_negocio']){await c.query('CREATE TEMPORARY TABLE copia_config_'+table+' LIKE '+table);await c.query('CREATE TEMPORARY TABLE '+table+' LIKE copia_config_'+table);}
  const roles=['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero'];
  for(let i=0;i<roles.length;i++){await c.query('INSERT INTO roles(id,nombre) VALUES (?,?)',[i+1,roles[i]]);await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'no-login','activo',?)",['u'+i,roles[i],'u'+i+'@example.invalid',i+1]);}
  await c.query('INSERT INTO configuracion_negocio(id) VALUES(1)');
  const auth=load('../src/middleware/authMiddleware.js',{'../config/db':db});
  const controller=load('../src/controllers/configuracionController.js',{'../config/db':db,'../services/configuracionService':servicio,mysql2:{createConnection:()=>({promise:()=>({query,beginTransaction:()=>c.beginTransaction(),commit:()=>c.commit(),rollback:()=>c.rollback(),end:async()=>{}})})}});
  const router=load('../src/routes/configuracionRoutes.js',{'../controllers/configuracionController':controller,'../middleware/rolesMiddleware':require('../src/middleware/rolesMiddleware')});
  const app=express();app.use(express.json());app.use('/api/configuracion',auth,router);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const request=async(method='GET',body,role=0,token=true)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/configuracion',{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+jwt.sign({rol:'ignorado'},process.env.JWT_SECRET,{issuer:'dondejuanca',subject:'u'+role,expiresIn:3600})}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
  await t.test('sin JWT 401; solo ambos administradores GET y PUT',async()=>{assert.equal((await request('GET',null,0,false)).status,401);for(let i=0;i<roles.length;i++)for(const method of ['GET','PUT'])assert.equal((await request(method,method==='PUT'?empty:null,i)).status,i<2?200:403);});
  await t.test('sin valores ficticios y sin auditoria para no-op',async()=>{const r=await request();for(const k of Object.keys(empty))assert.equal(r.body.configuracion[k],empty[k]);const [[n]]=await c.query('SELECT COUNT(*) n FROM auditoria');assert.equal(n.n,0);});
  await t.test('PUT persiste, GET conserva y auditoria usa actor JWT sin contactos',async()=>{const r=await request('PUT',{...empty,nombreNegocio:'Nombre de prueba',email:'prueba@example.invalid',impuesto:'19.25'});assert.equal(r.status,200);assert.equal((await request()).body.configuracion.nombreNegocio,'Nombre de prueba');const [[a]]=await c.query('SELECT * FROM auditoria');assert.equal(a.usuarios_id,'u0');assert.equal(a.resultado,'exitoso');assert.equal(a.entidad_id,'1');assert.match(a.cambios_json,/nombreNegocio/);assert.doesNotMatch(a.cambios_json,/example.invalid|Nombre de prueba/);});
  await t.test('validacion rechaza y no persiste',async()=>{assert.equal((await request('PUT',{...empty,email:'mal'})).status,400);assert.equal((await request()).body.configuracion.nombreNegocio,'Nombre de prueba');});
  await t.test('fallo auditoria revierte configuracion',async()=>{fallar=true;assert.equal((await request('PUT',{...empty,nombreNegocio:'No persistir'})).status,500);fallar=false;assert.equal((await request()).body.configuracion.nombreNegocio,'Nombre de prueba');});
 }finally{if(server)await new Promise(r=>server.close(r));await c.end();if(old===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=old;}
});
