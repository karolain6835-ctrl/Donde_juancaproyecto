const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const servicio=require('../src/services/perfilService');
test('Perfil: validaciones estrictas, confirmacion, limite bcrypt y campos privados',()=>{
 assert.deepEqual(servicio.validarPerfil({nombre:' Ana ',correo:' ana@example.invalid '}),{nombre:'Ana',correo:'ana@example.invalid'});
 for(const patch of [{nombre:''},{correo:'mal'},{rol:'SuperAdmin'},{estado:'inactivo'},{usuarios_id:'u1'}])assert.throws(()=>servicio.validarPerfil({nombre:'Ana',correo:'ana@example.invalid',...patch}));
 const good={contrasena_actual:'actual',contrasena_nueva:'nueva',confirmar_contrasena:'nueva'};
 for(const patch of [{contrasena_actual:''},{confirmar_contrasena:'otra'},{contrasena_nueva:'actual',confirmar_contrasena:'actual'},{contrasena_nueva:'x'.repeat(73)},{usuarios_id:'u1'}])assert.throws(()=>servicio.validarPassword({...good,...patch}));
 assert.equal(servicio.validarPassword(good),good);
});
test('Perfil propio: HTTP JWT, persistencia, login y auditoria',{skip:process.env.RUN_MYSQL_PERFIL_TESTS!=='1'},async t=>{
 require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
 const c=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 const express=require('express'),jwt=require('jsonwebtoken');let server,fallar=false;const old=process.env.JWT_SECRET;process.env.JWT_SECRET='perfil-test-secreto-exclusivo-1234567890';
 const load=(file,deps)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module:m,exports:m.exports,process,Buffer,console,require:n=>Object.hasOwn(deps,n)?deps[n]:require(n)});return m.exports;};
 const query=async(s,p)=>{if(fallar&&s.includes('INSERT INTO auditoria'))throw new Error('Fallo auditoria');return c.query(s,p);};
 const db={dbConfig:{},promise:()=>({query})};
 try{
  for(const table of ['usuarios','roles','auditoria']){await c.query('CREATE TEMPORARY TABLE copia_perfil_'+table+' LIKE '+table);await c.query('CREATE TEMPORARY TABLE '+table+' LIKE copia_perfil_'+table);}
  const roles=['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero'];
  for(let i=0;i<roles.length;i++){await c.query('INSERT INTO roles(id,nombre) VALUES (?,?)',[i+1,roles[i]]);await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'no-login','activo',?)",['u'+i,roles[i],'u'+i+'@example.invalid',i+1]);}

  const auth=load('../src/middleware/authMiddleware.js',{'../config/db':db});
  const controller=load('../src/controllers/perfilController.js',{'../config/db':db,'../services/perfilService':servicio,mysql2:{createConnection:()=>({promise:()=>({query,beginTransaction:()=>c.beginTransaction(),commit:()=>c.commit(),rollback:()=>c.rollback(),end:async()=>{}})})}});
  const usuarios=load('../src/controllers/usuariosController.js',{'../config/db':db});
  const router=load('../src/routes/usuariosRoutes.js',{'../controllers/perfilController':controller,'../controllers/usuariosController':usuarios,'../middleware/authMiddleware':auth,'../middleware/rolesMiddleware':require('../src/middleware/rolesMiddleware')});
  const app=express();app.use(express.json());app.use('/api/usuarios',router);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const request=async(method='GET',body,role=0,token=true,suffix='/me')=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/usuarios'+suffix,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+jwt.sign({rol:'ignorado'},process.env.JWT_SECRET,{issuer:'dondejuanca',subject:'u'+role,expiresIn:3600})}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
  const bcrypt=require('bcrypt'),oldPassword='Actual-segura-123',newPassword='Nueva-segura-456';
  const originalHash=await bcrypt.hash(oldPassword,12);await c.query("UPDATE usuarios SET password_hash=? WHERE id='u0'",[originalHash]);
  await t.test('propio perfil seguro para todos los roles, JWT requerido y actor no suplantable',async()=>{assert.equal((await request('GET',null,0,false)).status,401);for(let i=0;i<roles.length;i++){const r=await request('GET',null,i);assert.equal(r.status,200);assert.equal(r.body.usuario.id,'u'+i);assert.deepEqual(Object.keys(r.body.usuario).sort(),['correo','estado','id','nombre','rol']);}assert.equal((await request('GET',null,0,true,'/me?usuarios_id=u1')).status,400);});
  await t.test('editar nombre/correo y rechazar escalamiento',async()=>{const r=await request('PUT',{nombre:'Nombre nuevo',correo:'nuevo@example.invalid'});assert.equal(r.status,200);assert.equal((await request()).body.usuario.nombre,'Nombre nuevo');assert.equal((await request('GET',null,1)).body.usuario.correo,'u1@example.invalid');for(const extra of [{roles_id:2},{estado:'inactivo'},{id:'u1'}])assert.equal((await request('PUT',{nombre:'Nombre',correo:'nuevo@example.invalid',...extra})).status,400);});
  await t.test('otros roles editan solo su perfil y Mesera cambia su clave',async()=>{
   for(let i=1;i<roles.length;i++)assert.equal((await request('PUT',{nombre:'Propio '+i,correo:'u'+i+'@example.invalid'},i)).status,200);
   await c.query("UPDATE usuarios SET password_hash=? WHERE id='u3'",[originalHash]);
   assert.equal((await request('PUT',{contrasena_actual:oldPassword,contrasena_nueva:newPassword,confirmar_contrasena:newPassword},3,true,'/me/password')).status,200);
   const [[u]]=await c.query("SELECT password_hash FROM usuarios WHERE id='u0'");assert.equal(u.password_hash,originalHash);
  });
  await t.test('correo duplicado 409 y cambio atomico',async()=>{assert.equal((await request('PUT',{nombre:'No guardar',correo:'u1@example.invalid'})).status,409);assert.equal((await request()).body.usuario.nombre,'Nombre nuevo');});
  const pw={contrasena_actual:oldPassword,contrasena_nueva:newPassword,confirmar_contrasena:newPassword};
  await t.test('password actual incorrecta y confirmacion distinta rechazadas sin cerrar JWT',async()=>{assert.equal((await request('PUT',{...pw,contrasena_actual:'Incorrecta'},0,true,'/me/password')).status,400);assert.equal((await request('PUT',{...pw,confirmar_contrasena:'distinta'},0,true,'/me/password')).status,400);assert.equal((await request()).status,200);const [[u]]=await c.query("SELECT password_hash FROM usuarios WHERE id='u0'");assert.equal(u.password_hash,originalHash);});
  await t.test('cambio bcrypt12 y login nuevo funciona; anterior falla',async()=>{assert.equal((await request('PUT',pw,0,true,'/me/password')).status,200);const [[u]]=await c.query("SELECT password_hash FROM usuarios WHERE id='u0'");assert.notEqual(u.password_hash,originalHash);assert.equal(bcrypt.getRounds(u.password_hash),12);assert.ok(await bcrypt.compare(newPassword,u.password_hash));assert.equal((await request('POST',{correo:'nuevo@example.invalid',contrasena:newPassword},0,false,'/login')).status,200);assert.equal((await request('POST',{correo:'nuevo@example.invalid',contrasena:oldPassword},0,false,'/login')).status,401);assert.equal((await request()).status,200);});
  await t.test('auditoria JWT sin contrasenas hashes ni contactos',async()=>{const [events]=await c.query("SELECT * FROM auditoria WHERE usuarios_id='u0'");assert.equal(events.length,2);assert.ok(events.some(e=>e.tipo_evento==='contrasena_cambiada'));for(const e of events){assert.equal(e.entidad_id,'u0');assert.equal(e.resultado,'exitoso');assert.doesNotMatch(e.cambios_json,/Actual-segura|Nueva-segura|password|hash|example.invalid/);}});
  await t.test('fallo auditoria revierte perfil y password',async()=>{fallar=true;assert.equal((await request('PUT',{nombre:'No guardar',correo:'rollback@example.invalid'})).status,500);assert.equal((await request('PUT',{contrasena_actual:newPassword,contrasena_nueva:oldPassword,confirmar_contrasena:oldPassword},0,true,'/me/password')).status,500);fallar=false;assert.equal((await request()).body.usuario.nombre,'Nombre nuevo');const [[u]]=await c.query("SELECT password_hash FROM usuarios WHERE id='u0'");assert.ok(await bcrypt.compare(newPassword,u.password_hash));});

 }finally{if(server)await new Promise(r=>server.close(r));await c.end();if(old===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=old;}
});
