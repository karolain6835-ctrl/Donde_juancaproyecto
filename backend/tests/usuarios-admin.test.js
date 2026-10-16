const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const express=require('express'),jwt=require('jsonwebtoken'),bcrypt=require('bcrypt');
test('Administración de usuarios: HTTP/JWT y persistencia MySQL temporal',{skip:process.env.RUN_MYSQL_USUARIOS_ADMIN_TESTS!=='1'},async t=>{
 require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
 const c=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 const anterior=process.env.JWT_SECRET;process.env.JWT_SECRET='usuarios-admin-secreto-exclusivo-pruebas-123456';let server;
 const db={promise:()=>({query:(s,p)=>c.query(s,p)}),query:(s,p,cb)=>{if(typeof p==='function'){cb=p;p=undefined;}c.query(s,p).then(([rows])=>cb(null,rows),cb);}};
 const load=(file,deps)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module:m,exports:m.exports,process,Buffer,console,require:n=>Object.hasOwn(deps,n)?deps[n]:require(n)});return m.exports;};
 try{
  for(const table of ['roles','usuarios']){await c.query(`CREATE TEMPORARY TABLE copia_usuarios_admin_${table} LIKE ${table}`);await c.query(`CREATE TEMPORARY TABLE ${table} LIKE copia_usuarios_admin_${table}`);}
  const roles=['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero'];
  for(let i=0;i<roles.length;i++)await c.query('INSERT INTO roles(id,nombre,activo) VALUES (?,?,1)',[i+11,roles[i]]);
  await c.query("INSERT INTO roles(id,nombre) VALUES (99,'Caja')");
  await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('admin','Admin','admin@example.invalid',?,'activo',11)",[await bcrypt.hash('Admin123!',4)]);
  const auth=load('../src/middleware/authMiddleware.js',{'../config/db':db});
  const controller=load('../src/controllers/usuariosController.js',{'../config/db':db});
  const router=load('../src/routes/usuariosRoutes.js',{'../controllers/perfilController':{consultar(){},actualizar(){},password(){}},'../controllers/usuariosController':controller,'../middleware/authMiddleware':auth,'../middleware/rolesMiddleware':require('../src/middleware/rolesMiddleware')});
  const app=express();app.use(express.json());app.use('/api/usuarios',router);server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const token=jwt.sign({rol:'incorrecto'},process.env.JWT_SECRET,{issuer:'dondejuanca',subject:'admin',expiresIn:3600});
  const req=async(method,route,body,authenticated=true)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/usuarios${route}`,{method,headers:{'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  const body={nombre:'Nuevo usuario',correo:'nuevo@example.invalid',roles_id:13,contrasena:'NuevaClave123!'};let id;
  await t.test('listado seguro y catálogo de roles reales sin IDs asumidos',async()=>{
   const r=await req('GET','');assert.equal(r.status,200);assert.deepEqual(Object.keys(r.data.datos[0]).sort(),['correo','estado','id','nombre','rol']);
   const rr=await req('GET','/roles');assert.equal(rr.data.datos.length,6);assert.ok(rr.data.datos.every(x=>roles.includes(x.nombre)));
  });
  await t.test('crear persiste bcrypt compatible con login y no expone secretos',async()=>{
   const r=await req('POST','/registrar',body);assert.equal(r.status,201);id=r.data.usuario.id;assert.equal(r.data.usuario.rol,'Mesero');assert.equal(JSON.stringify(r.data).includes(body.contrasena),false);
   const [[u]]=await c.query('SELECT * FROM usuarios WHERE id=?',[id]);assert.equal(u.estado,'activo');assert.notEqual(u.password_hash,body.contrasena);assert.ok(await bcrypt.compare(body.contrasena,u.password_hash));
   assert.equal((await req('POST','/login',{correo:body.correo,contrasena:body.contrasena},false)).status,200);
  });
  await t.test('correo duplicado devuelve 409, incluso concurrente',async()=>{
   assert.equal((await req('POST','/registrar',body)).status,409);
   const result=await Promise.all([req('POST','/registrar',{...body,correo:'carrera@example.invalid'}),req('POST','/registrar',{...body,correo:'carrera@example.invalid'})]);assert.deepEqual(result.map(r=>r.status).sort(),[201,409]);
  });
  await t.test('datos inválidos no persisten',async()=>{
   const [[antes]]=await c.query('SELECT COUNT(*) AS n FROM usuarios');
   for(const patch of [{nombre:''},{nombre:'x'.repeat(101)},{correo:'invalido'},{roles_id:999},{roles_id:99},{roles_id:'13'},{contrasena:''},{contrasena:'x'.repeat(73)}])assert.equal((await req('POST','/registrar',{...body,...patch})).status,400);
   const [[despues]]=await c.query('SELECT COUNT(*) AS n FROM usuarios');assert.equal(antes.n,despues.n);
  });
  await t.test('desactivar y activar persisten y controlan el login',async()=>{
   for(const [estado,login]of [['inactivo',403],['activo',200]]){assert.equal((await req('PUT',`/${id}/estado`,{estado})).status,200);const [[u]]=await c.query('SELECT estado FROM usuarios WHERE id=?',[id]);assert.equal(u.estado,estado);assert.equal((await req('POST','/login',{correo:body.correo,contrasena:body.contrasena},false)).status,login);}
   assert.equal((await req('PUT','/inexistente/estado',{estado:'inactivo'})).status,404);assert.equal((await req('PUT',`/${id}/estado`,{estado:123})).status,400);
  });
  await t.test('JWT obligatorio y roles actuales: solo Administrador/SuperAdmin',async()=>{
   const paths=[['GET',''],['GET','/roles'],['POST','/registrar'],['PUT',`/${id}/estado`]];
   for(const [method,p]of paths)assert.equal((await req(method,p,undefined,false)).status,401);
   for(let i=0;i<roles.length;i++){await c.query("UPDATE usuarios SET roles_id=? WHERE id='admin'",[i+11]);for(const [method,p]of paths){const r=await req(method,p,method==='POST'?{...body,correo:`rol${i}@example.invalid`}:method==='PUT'?{estado:'activo'}:undefined);assert.equal(r.status,i<2?(method==='POST'?201:200):403,roles[i]+p);}}
  });
 }finally{if(server)await new Promise(r=>server.close(r));await c.end();if(anterior===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=anterior;}
});
