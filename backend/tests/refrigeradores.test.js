const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const servicio=require('../src/services/refrigeradoresService');
const body={nombre:'Equipo de prueba',ubicacion:'Barra',estado:'activa'};
test('Refrigeradores valida contrato real, estados y longitudes',()=>{
 assert.equal(servicio.validar({...body,ubicacion:''}).ubicacion,null);
 for(const patch of [{nombre:''},{nombre:'x'.repeat(81)},{ubicacion:'x'.repeat(46)},{estado:'inactivo'},{temperatura:4},{productos:30},{actualizado_por:'falso'}])assert.throws(()=>servicio.validar({...body,...patch}),e=>e.status===400);
});
test('Refrigeradores: HTTP JWT, MySQL temporal, auditoria y compatibilidad mermas',{skip:process.env.RUN_MYSQL_REFRIGERADORES_TESTS!=='1'},async t=>{
 require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
 const c=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 const express=require('express'),jwt=require('jsonwebtoken');let server,fallar=false;const old=process.env.JWT_SECRET;process.env.JWT_SECRET='refrigeradores-test-secreto-exclusivo-1234567890';
 const load=(file,deps)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module:m,exports:m.exports,process,Buffer,console,require:n=>Object.hasOwn(deps,n)?deps[n]:require(n)});return m.exports;};
 const query=async(s,p)=>{if(fallar&&s.includes('INSERT INTO auditoria'))throw new Error('Fallo auditoria');return c.query(s,p);};
 const db={dbConfig:{},promise:()=>({query})};
 try{
  for(const table of ['usuarios','roles','auditoria','refrigeradores','productos','movimientos_inventario','mermas','merma_motivos','refrigerador_stock']){await c.query('CREATE TEMPORARY TABLE copia_ref_'+table+' LIKE '+table);await c.query('CREATE TEMPORARY TABLE '+table+' LIKE copia_ref_'+table);}
  const roles=['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero'];
  for(let i=0;i<roles.length;i++){await c.query('INSERT INTO roles(id,nombre) VALUES (?,?)',[i+1,roles[i]]);await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'no-login','activo',?)",['u'+i,roles[i],'u'+i+'@example.invalid',i+1]);}

  const auth=load('../src/middleware/authMiddleware.js',{'../config/db':db});
  const controller=load('../src/controllers/refrigeradoresController.js',{'../config/db':db,'../services/refrigeradoresService':servicio,mysql2:{createConnection:()=>({promise:()=>({query,beginTransaction:()=>c.beginTransaction(),commit:()=>c.commit(),rollback:()=>c.rollback(),end:async()=>{}})})}});
  const router=load('../src/routes/refrigeradoresRoutes.js',{'../controllers/refrigeradoresController':controller,'../middleware/rolesMiddleware':require('../src/middleware/rolesMiddleware')});
  const app=express();app.use(express.json());app.use('/api/refrigeradores',auth,router);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const request=async(method='GET',body,role=0,token=true,suffix='')=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/refrigeradores'+suffix,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+jwt.sign({rol:'ignorado'},process.env.JWT_SECRET,{issuer:'dondejuanca',subject:'u'+role,expiresIn:3600})}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};
  await t.test('vacio real sin equipos ficticios',async()=>{const r=await request();assert.deepEqual(r.body.datos,[]);assert.equal(r.body.total,0);});
  await t.test('JWT y roles: solo Administrador/SuperAdmin',async()=>{assert.equal((await request('GET',null,0,false)).status,401);for(let i=0;i<roles.length;i++){assert.equal((await request('GET',null,i)).status,i<2?200:403);assert.equal((await request('POST',body,i)).status,i<2?201:403);assert.equal((await request('PUT',body,i,true,'/ausente')).status,i<2?404:403);}});
  let id;
  await t.test('crear persiste y audita actor JWT; sin stock ni sensores',async()=>{const r=await request('POST',body);assert.equal(r.status,201);id=r.body.refrigerador.id;const listed=(await request()).body.datos.find(r=>r.id===id);assert.equal(listed.nombre,body.nombre);assert.deepEqual(Object.keys(listed).sort(),['estado','id','nombre','ubicacion']);const [[a]]=await c.query('SELECT * FROM auditoria WHERE entidad_id=?',[id]);assert.equal(a.usuarios_id,'u0');assert.equal(a.resultado,'exitoso');assert.equal(a.tipo_evento,'refrigerador_creado');});
  await t.test('editar y estados persisten; borrados logicos excluidos',async()=>{for(const estado of ['mantenimiento','apagada','activa']){assert.equal((await request('PUT',{...body,nombre:'Renombrado',estado},0,true,'/'+id)).status,200);assert.equal((await request()).body.datos.find(r=>r.id===id).estado,estado);}await c.query("INSERT INTO refrigeradores(id,nombre,estado,deleted_at) VALUES('deleted','No visible','activa',NOW())");assert.equal((await request()).body.datos.some(r=>r.id==='deleted'),false);assert.equal((await request('PUT',body,0,true,'/deleted')).status,404);});
  await t.test('validaciones y 404 no crean equipos ni alteran historial',async()=>{const [[before]]=await c.query('SELECT COUNT(*) n FROM refrigeradores');assert.equal((await request('POST',{...body,temperatura:5})).status,400);assert.equal((await request('PUT',body,0,true,'/no-existe')).status,404);const [[after]]=await c.query('SELECT COUNT(*) n FROM refrigeradores');assert.equal(before.n,after.n);});
  await t.test('compatibilidad lectura y registro real de merma, sin sincronizacion inventada',async()=>{
   await c.query("INSERT INTO merma_motivos(id,nombre) VALUES('motivo','Prueba')");
   await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES('p','Producto test','REFTEST',100,12.34,27,1,'activo',1,'prov','hist')");
   const merma=load('../src/controllers/mermasController.js',{'../config/db':db,'../services/identidadService':require('../src/services/identidadService'),mysql2:{createConnection:()=>({promise:()=>({query,beginTransaction:()=>c.beginTransaction(),commit:()=>c.commit(),rollback:()=>c.rollback(),end:async()=>{}})})}});
   const response=()=>({status(n){this.code=n;return this;},json(value){this.body=value;return this;}});
   const catalog=response();await merma.obtenerRefrigeradores({},catalog);assert.ok(catalog.body.datos.some(r=>r.id===id&&r.nombre==='Renombrado'));
   const result=response();await merma.registrarMerma({usuario:{id:'u0'},body:{productos_id:'p',cantidad:2,merma_motivos_id:'motivo',refrigeradores_id:id}},result);assert.equal(result.code,201);
   const [[p]]=await c.query("SELECT cantidad_disponible FROM productos WHERE id='p'");assert.equal(p.cantidad_disponible,25);
   const [[m]]=await c.query('SELECT refrigeradores_id FROM mermas');assert.equal(m.refrigeradores_id,id);
   await request('PUT',{...body,estado:'apagada'},0,true,'/'+id);const [[again]]=await c.query("SELECT cantidad_disponible FROM productos WHERE id='p'");assert.equal(again.cantidad_disponible,25);const [[rs]]=await c.query('SELECT COUNT(*) n FROM refrigerador_stock');assert.equal(rs.n,0);
  });
  await t.test('fallo auditoria revierte alta y edicion',async()=>{const [[before]]=await c.query('SELECT COUNT(*) n FROM refrigeradores');fallar=true;assert.equal((await request('POST',body)).status,500);assert.equal((await request('PUT',{...body,nombre:'No guardar'},0,true,'/'+id)).status,500);fallar=false;const [[after]]=await c.query('SELECT COUNT(*) n FROM refrigeradores');assert.equal(after.n,before.n);assert.notEqual((await request()).body.datos.find(r=>r.id===id).nombre,'No guardar');});

 }finally{if(server)await new Promise(r=>server.close(r));await c.end();if(old===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=old;}
});
