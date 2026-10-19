const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),sync=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {randomUUID}=require('node:crypto'),sharp=require('sharp');
const imagen=require('../src/services/productoImagenService');

test('Imagen real: decodifica JPG/JPEG/PNG/WebP, rechaza ejecutables, SVG y contenido falso',async()=>{
  const raw={create:{width:3,height:2,channels:3,background:'#26764a'}};
  for(const [ext,mime,format]of [['jpg','image/jpeg','jpeg'],['jpeg','image/jpeg','jpeg'],['png','image/png','png'],['webp','image/webp','webp']]){
    const buffer=await sharp(raw)[format]().toBuffer();const result=await imagen.preparar({originalname:'producto.'+ext,mimetype:mime,buffer,size:buffer.length});
    const meta=await sharp(result).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,3);assert.equal(meta.exif,undefined);
  }
  for(const [name,mime,buffer]of [['ejecutable.exe','application/octet-stream',Buffer.from('MZ')],['falsa.jpg','image/jpeg',Buffer.from('MZ executable')],['vector.svg','image/svg+xml',Buffer.from('<svg/>')],['falsa.png','image/png',Buffer.from('<script/>')]])await assert.rejects(()=>imagen.preparar({originalname:name,mimetype:mime,buffer,size:buffer.length}),e=>e.status===415);
  await assert.rejects(()=>imagen.preparar(),e=>e.status===400);
  const huge=await sharp({create:{width:5000,height:5000,channels:3,background:'#fff'}}).png().toBuffer();
  await assert.rejects(()=>imagen.preparar({originalname:'grande.png',mimetype:'image/png',buffer:huge,size:huge.length}),e=>e.status===415);
});

test('Imágenes HTTP/MariaDB: opcionales, permisos, reemplazo, eliminación, rollback y archivos seguros',{skip:process.env.RUN_MYSQL_PRODUCTO_IMAGEN_TESTS!=='1'},async t=>{
  assert.match(process.env.DB_NAME||'',/^dj_v1_regression_[a-f0-9]{32}$/,'Ejecutar mediante e2e/backend-regression.cjs, nunca contra la base habitual.');
  const mysql=require('mysql2/promise'),jwt=require('jsonwebtoken');
  const config={host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME};
  const c=await mysql.createConnection(config),root=await fs.mkdtemp(path.join(os.tmpdir(),'dj-images-'));
  const ids={user:randomUUID(),waiter:randomUUID(),a:randomUUID(),b:randomUUID(),prov:randomUUID()},cat=990001;
  let server,failAudit=false;const old=process.env.JWT_SECRET;process.env.JWT_SECRET=randomUUID()+randomUUID();
  const load=(file,deps={},env=process)=>{const m={exports:{}};vm.runInNewContext(sync.readFileSync(path.join(__dirname,'../src',file),'utf8'),{module:m,exports:m.exports,process:env,__dirname:path.dirname(path.join(__dirname,'../src',file)),Buffer,console,require:n=>Object.hasOwn(deps,n)?deps[n]:require(n)});return m.exports;};
  const service=load('services/productoImagenService.js',{}, {env:{...process.env,PRODUCT_IMAGES_DIR:root}});
  const db={dbConfig:config,promise:()=>c,query:(sql,p,cb)=>{if(typeof p==='function'){cb=p;p=[];}c.query(sql,p).then(([r])=>cb(null,r),cb);}};
  const createConnection=()=>{const real=require('mysql2').createConnection(config).promise();return {promise:()=>({query:(s,p)=>{if(failAudit&&s.includes('INSERT INTO auditoria'))throw Error('Fallo auditado');return real.query(s,p);},beginTransaction:()=>real.beginTransaction(),commit:()=>real.commit(),rollback:()=>real.rollback(),end:()=>real.end()})};};
  try{
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) SELECT ?,'Imágenes',?,'fixture','activo',id FROM roles WHERE nombre='Administrador'",[ids.user,ids.user+'@example.invalid']);
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) SELECT ?,'Mesero',?,'fixture','activo',id FROM roles WHERE nombre='Mesero'",[ids.waiter,ids.waiter+'@example.invalid']);
    await c.query("INSERT INTO categorias(id,nombre) VALUES (?,'Imágenes')",[cat]);await c.query("INSERT INTO proveedores(id,estado) VALUES (?,'activo')",[ids.prov]);
    for(const id of [ids.a,ids.b])await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id) VALUES (?,'Producto',?,2844.44,0,10,0,'activo',?,?)",[id,id,cat,ids.prov]);
    const controller=load('controllers/productoImagenController.js',{'../config/db':db,mysql2:{createConnection},'../services/productoImagenService':service,'../services/auditoriaService':require('../src/services/auditoriaService'),'../services/errorLog':{registrarError(){}}});
    const deps={'../controllers/productoImagenController':controller,'../middleware/rolesMiddleware':require('../src/middleware/rolesMiddleware'),'../middleware/imagenProductoUpload':require('../src/middleware/imagenProductoUpload')};
    const auth=load('middleware/authMiddleware.js',{'../config/db':db});
    const products=load('controllers/productosController.js',{'../config/db':db});
    const originalRoutes=load('routes/productosRoutes.js',{'../controllers/productosController':products,'../middleware/rolesMiddleware':require('../src/middleware/rolesMiddleware')});
    const app=require('express')();app.use(require('express').json());app.use('/api/productos',auth,load('routes/productoImagenRoutes.js',deps));app.use('/api/productos',auth,originalRoutes);app.use('/uploads/productos',load('routes/productoImagenArchivoRoutes.js',deps));
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base='http://127.0.0.1:'+server.address().port;
    const token=id=>jwt.sign({},process.env.JWT_SECRET,{issuer:'dondejuanca',subject:id,expiresIn:3600});
    const request=async(method,url,body,user=ids.user)=>{const r=await fetch(base+url,{method,headers:{...(user?{Authorization:'Bearer '+token(user)}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});let json;try{json=await r.clone().json();}catch{}return {status:r.status,json,response:r};};
    const png=await sharp({create:{width:6,height:5,channels:3,background:'#567844'}}).png().toBuffer();
    const form=(buffer=png,name='producto.png',type='image/png')=>{const f=new FormData();f.append('imagen',new Blob([buffer],{type}),name);return f;};
    const upload=(id=ids.a,body=form(),user=ids.user)=>request('PUT','/api/productos/'+id+'/imagen',body,user);
    const row=async id=>{const [[r]]=await c.query('SELECT imagen_url,cantidad_disponible,costo_promedio_ponderado FROM productos WHERE id=?',[id]);return r;};
    await t.test('existentes sin imagen y CRUD JSON sin imagen siguen funcionando',async()=>{
      const r=await request('GET','/api/productos/'+ids.a);assert.equal(r.status,200);assert.equal(r.json.datos.imagen_url,null);assert.equal((await row(ids.a)).cantidad_disponible,10);
    });
    await t.test('imagen válida: URL generada, formato real WebP, lectura y encabezados seguros',async()=>{
      const r=await upload();assert.equal(r.status,200);assert.match(r.json.datos.imagen_url,service.patron);
      const read=await request('GET',r.json.datos.imagen_url,undefined,null);assert.equal(read.status,200);assert.match(read.response.headers.get('content-type'),/image\/webp/);assert.equal(read.response.headers.get('x-content-type-options'),'nosniff');
      assert.equal((await sharp(Buffer.from(await read.response.arrayBuffer())).metadata()).format,'webp');assert.equal((await row(ids.a)).cantidad_disponible,10);assert.equal((await row(ids.a)).costo_promedio_ponderado,'0.00');
    });
    await t.test('tipo inválido, archivo falso, exceso de tamaño y campos extra no persisten',async()=>{
      const before=await row(ids.a),files=await fs.readdir(root);
      assert.equal((await upload(ids.a,form(Buffer.from('MZ'),'mal.exe','application/octet-stream'))).status,415);
      assert.equal((await upload(ids.a,form(Buffer.from('MZ'),'mal.png','image/png'))).status,415);
      assert.equal((await upload(ids.a,form(Buffer.alloc(5*1024*1024+1),'grande.png','image/png'))).status,413);
      const extra=form();extra.append('imagen_url','../../otro');assert.equal((await upload(ids.a,extra)).status,400);
      assert.equal((await upload(ids.a,{})).status,400);assert.deepEqual(await row(ids.a),before);assert.deepEqual(await fs.readdir(root),files);
    });
    await t.test('JWT y roles existentes; inexistente no crea archivo; rutas arbitrarias no se sirven',async()=>{
      assert.equal((await upload(ids.a,form(),null)).status,401);assert.equal((await upload(ids.a,form(),ids.waiter)).status,403);
      assert.equal((await upload(randomUUID())).status,404);
      assert.equal((await request('GET','/uploads/productos/secreto.txt',undefined,null)).status,404);
      await fs.writeFile(path.join(root,'otro-producto.txt'),'conservar');await service.borrar('/uploads/productos/../../otro-producto.txt');assert.equal(await fs.readFile(path.join(root,'otro-producto.txt'),'utf8'),'conservar');
    });
    await t.test('reemplazar limpia anterior y conserva archivo de otro producto; PUT normal conserva imagen',async()=>{
      await upload(ids.b);const other=(await row(ids.b)).imagen_url,previous=(await row(ids.a)).imagen_url;
      const r=await upload();assert.notEqual(r.json.datos.imagen_url,previous);assert.equal((await request('GET',previous,undefined,null)).status,404);assert.equal((await request('GET',other,undefined,null)).status,200);
      const json={nombre:'Editado',codigo:ids.a,precio_venta:2844.44,stock_minimo:0,estado:'activo',categorias_id:cat,proveedores_id:ids.prov,imagen_url:other};
      assert.equal((await request('PUT','/api/productos/'+ids.a,json)).status,200);assert.equal((await row(ids.a)).imagen_url,r.json.datos.imagen_url);
    });
    await t.test('fallo de auditoría revierte BD y borra solo el archivo nuevo',async()=>{
      const before=await row(ids.a),files=(await fs.readdir(root)).sort();failAudit=true;assert.equal((await upload()).status,500);failAudit=false;
      assert.deepEqual(await row(ids.a),before);assert.deepEqual((await fs.readdir(root)).sort(),files);
    });
    await t.test('reemplazos concurrentes dejan una imagen vigente y sin archivos de otros productos borrados',async()=>{
      const results=await Promise.all([upload(),upload()]);assert.ok(results.every(r=>r.status===200));
      assert.equal((await request('GET',(await row(ids.a)).imagen_url,undefined,null)).status,200);assert.equal((await request('GET',(await row(ids.b)).imagen_url,undefined,null)).status,200);
      assert.equal((await fs.readdir(root)).filter(f=>f.endsWith('.webp')).length,2);
    });
    await t.test('quitar imagen es persistente/idempotente y conserva producto y stock',async()=>{
      const before=(await row(ids.a)).imagen_url;assert.equal((await request('DELETE','/api/productos/'+ids.a+'/imagen')).status,200);assert.equal((await row(ids.a)).imagen_url,null);assert.equal((await row(ids.a)).cantidad_disponible,10);
      assert.equal((await request('GET',before,undefined,null)).status,404);assert.equal((await request('DELETE','/api/productos/'+ids.a+'/imagen')).status,200);
      const [events]=await c.query("SELECT usuarios_id FROM auditoria WHERE entidad_id=? AND tipo_evento='imagen_producto_eliminada'",[ids.a]);assert.equal(events.length,1);assert.equal(events[0].usuarios_id,ids.user);
    });
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve));
    await c.query('DELETE FROM auditoria WHERE usuarios_id IN (?,?)',[ids.user,ids.waiter]);await c.query('DELETE FROM productos WHERE id IN (?,?)',[ids.a,ids.b]);await c.query('DELETE FROM usuarios WHERE id IN (?,?)',[ids.user,ids.waiter]);await c.query('DELETE FROM proveedores WHERE id=?',[ids.prov]);await c.query('DELETE FROM categorias WHERE id=?',[cat]);await c.end();
    assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.match(path.basename(root),/^dj-images-/);
    for(const f of await fs.readdir(root))await fs.unlink(path.join(root,f));await fs.rmdir(root);
    if(old===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=old;
  }
});
