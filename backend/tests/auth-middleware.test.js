const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const jwt=require('jsonwebtoken'),express=require('express');
test('JWT y montaje: MySQL real con tablas temporales', {skip:process.env.RUN_MYSQL_AUTH_TESTS!=='1'},async t=>{
  require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
  const real=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  const anterior=process.env.JWT_SECRET;process.env.JWT_SECRET='secreto-exclusivo-para-pruebas-auth-123456789';
  let server,fallo=false;
  const db={promise:()=>({query:(sql,p)=>{if(fallo)throw new Error('Fallo privado SQL');return real.query(sql,p);}})};
  const load=(archivo,deps)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,archivo),'utf8'),{
    module:m,exports:m.exports,process,Buffer,console:{log(){},error(){}},require:n=>Object.hasOwn(deps,n)?deps[n]:(n === '../services/identidadService' ? require('../src/services/identidadService') : n === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : (n === '../services/auditoriaService' ? require('../src/services/auditoriaService') : require(n)))
  });return m.exports;};
  try{
    for(const tabla of ['usuarios','roles','clientes']){await real.query(`CREATE TEMPORARY TABLE copia_auth_${tabla} LIKE ${tabla}`);await real.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_auth_${tabla}`);}
    await real.query("INSERT INTO roles (id,nombre,activo) VALUES (1,'Administrador',1),(2,'Mesero',NULL)");
    const hash=await require('bcrypt').hash('PruebaAuth123!',4);
    await real.query("INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id) VALUES ('u1','Usuario','auth@example.invalid',?,'activo',1)",[hash]);
    await real.query("INSERT INTO clientes (id,nombre,estado,usuarios_id) VALUES ('c1','Cliente','activo','u1')");
    const auth=load('../src/middleware/authMiddleware.js',{'../config/db':db});
    const usuarios=load('../src/controllers/usuariosController.js',{'../config/db':db});
    const usuariosRouter=load('../src/routes/usuariosRoutes.js',{'../controllers/perfilController':{consultar(){},actualizar(){},password(){}},'../controllers/usuariosController':usuarios,'../middleware/authMiddleware':auth});
    const clientes=load('../src/controllers/clientesController.js',{'../config/db':db,'mysql2':{createConnection:()=>({promise:()=>({query:(s,p)=>real.query(s,p),beginTransaction:()=>real.beginTransaction(),commit:()=>real.commit(),rollback:()=>real.rollback(),end:async()=>{}})})}});
    const clientesRouter=load('../src/routes/clientesRoutes.js',{'../controllers/clientesController':clientes});
    // Ejecutar el montaje real de index; los módulos ajenos se sustituyen por routers
    // inertes para que las pruebas no puedan escribir ni abrir conexiones persistentes.
    const app=express(),escuchar=app.listen.bind(app);app.listen=()=>{};
    const stub=express.Router();stub.get('/',(req,res)=>res.json({usuario:req.usuario}));
    const deps={'express':()=>app,'cors':()=>((req,res,next)=>next()),'./config/db':db,'./middleware/authMiddleware':auth,
      './routes/clientesRoutes':clientesRouter,'./routes/usuariosRoutes':usuariosRouter,'dotenv':{config(){}}};
 deps['./middleware/errorMiddleware']=require('../src/middleware/errorMiddleware');
    const codigo=fs.readFileSync(path.join(__dirname,'../src/index.js'),'utf8');
    for(const [,ruta]of codigo.matchAll(/require\('(\.\/routes\/[^']+)'\)/g))if(!deps[ruta])deps[ruta]=stub;
    // Express también se usa para express.json() en el montaje.
    deps.express=Object.assign(()=>app,{json:express.json});
    load('../src/index.js',deps);
    server=await new Promise(resolve=>{const s=escuchar(0,'127.0.0.1',()=>resolve(s));});
    const base=`http://127.0.0.1:${server.address().port}`;
    const req=async(ruta,token,method='GET',body)=>{
      const r=await fetch(base+ruta,{method,headers:{'Content-Type':'application/json',...(token===undefined?{}:{Authorization:token})},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:r.status,data:await r.json()};
    };
    const firmar=(payload={},opciones={})=>jwt.sign({roles_id:1,rol:'Rol antiguo',...payload},process.env.JWT_SECRET,{algorithm:'HS256',issuer:'dondejuanca',subject:'u1',expiresIn:3600,...opciones});
    const token=firmar(),bearer=`Bearer ${token}`;
    for(const [nombre,header]of [['ausente',undefined],['vacio','Bearer '],['alterado',`Bearer ${firmar({}, {subject:'otro'})}x`],['expirado',`Bearer ${firmar({}, {expiresIn:-1})}`],['issuer',`Bearer ${firmar({}, {issuer:'otro'})}`],['algoritmo',`Bearer ${firmar({}, {algorithm:'HS384'})}`],['inexistente',`Bearer ${firmar({}, {subject:'no-existe'})}`],['sin expiracion',`Bearer ${jwt.sign({sub:'u1'},process.env.JWT_SECRET,{issuer:'dondejuanca'})}`]]){
      await t.test(`401 ${nombre}`,async()=>assert.equal((await req('/api/clientes',header)).status,401));
    }
    for(const estado of ['inactivo','bloqueado'])await t.test(`401 usuario ${estado}`,async()=>{
      await real.query('UPDATE usuarios SET estado=?',[estado]);assert.equal((await req('/api/clientes',bearer)).status,401);await real.query("UPDATE usuarios SET estado='activo'");
    });
    await t.test('usuario activo continua; identidad no incluye secretos',async()=>{
      const r=await req('/api/categorias',bearer);assert.equal(r.status,200);assert.deepEqual(r.data.usuario,{id:'u1',nombre:'Usuario',email:'auth@example.invalid',roles_id:1,rol:'Administrador'});
      const clientes=await req('/api/clientes',bearer);assert.equal(clientes.status,200);assert.equal(clientes.data.total,1);
    });
    await t.test('rol actual sustituye al del token, incluso activo NULL',async()=>{
      await real.query('UPDATE usuarios SET roles_id=2');const r=await req('/api/categorias',bearer);assert.equal(r.status,200);assert.equal(r.data.usuario.roles_id,2);assert.equal(r.data.usuario.rol,'Mesero');
    });
    await t.test('rol inexistente rechaza identidad',async()=>{
      await real.query('UPDATE usuarios SET roles_id=999');assert.equal((await req('/api/clientes',bearer)).status,401);await real.query('UPDATE usuarios SET roles_id=1');
    });
    await t.test('error MySQL responde 500 generico',async()=>{
      fallo=true;const r=await req('/api/clientes',bearer);fallo=false;assert.equal(r.status,500);assert.deepEqual(r.data,{error:'No se pudo resolver la identidad.'});
    });
    await t.test('login real publico; otras rutas de usuarios protegidas',async()=>{
      const r=await req('/api/usuarios/login',undefined,'POST',{correo:'auth@example.invalid',contrasena:'PruebaAuth123!'});assert.equal(r.status,200);assert.ok(r.data.token);
      assert.equal((await req('/api/usuarios/registrar',undefined,'POST',{})).status,401);
      assert.equal((await req('/api/usuarios/u1/estado',undefined,'PUT',{estado:'inactivo'})).status,401);
    });
    await t.test('todos los routers operativos exigen token',async()=>{
      for(const prefijo of ['categorias','productos','mesas','pedidos','pagos','juegos','inventario','mermas','proveedores','compras','clientes','ventas','cierres-caja','kanban','sesiones-division'])assert.equal((await req('/api/'+prefijo)).status,401,prefijo);
    });
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve));await real.end();
    if(anterior===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=anterior;
  }
});
