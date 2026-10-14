const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const express = require('express'), jwt = require('jsonwebtoken');
const { autorizarRoles } = require('../src/middleware/rolesMiddleware');

test('autorizaci?n exige identidad y compara exclusivamente el rol exacto actual', () => {
  for (const [usuario, expected] of [[undefined,401],[{rol:'Desconocido'},403],[{rol:'administrador'},403],[{rol:'Mesero'},403],[{rol:'Administrador'},200]]) {
    let status=200, next=false;
    const res={status(value){status=value;return this;},json(){return this;}};
    autorizarRoles('Administrador')({usuario,body:{rol:'Administrador'}},res,()=>{next=true;});
    assert.equal(status,expected); assert.equal(next,expected===200);
  }
  let denied;
  autorizarRoles()({usuario:{rol:'Administrador'}},{status(value){denied=value;return this;},json(){}},()=>assert.fail('Debe negar por defecto'));
  assert.equal(denied,403);
});

// Matriz independiente de las declaraciones de los routers. Controladores inertes:
// prueba autorizaci?n HTTP real sin ejecutar operaciones de negocio ni escrituras persistentes.
const cases = [
 ['MB','GET','kanban/pedidos'],['MB','PATCH','kanban/pedidos/x/despachar-todo'],
 ['MB','PATCH','kanban/pedidos/x/aceptar'],
 ['M','GET','usuarios/responsables'],['MC','GET','pedidos'],
 ['ALL','GET','categorias'],['ALL','GET','productos'],['ALL','GET','productos/x'],
 ['A','POST','productos'],['A','PUT','productos/x'],['A','DELETE','productos/x'],
 ['MC','GET','mesas/x/cuenta'],['MC','GET','mesas/estado/disponible'],['C','PATCH','mesas/x/estado'],['M','POST','mesas/traslado'],
 ['M','POST','pedidos'],['M','POST','pedidos/x/items'],['MC','GET','pedidos/x'],['MC','GET','pedidos/x/cuenta'],['C','PUT','pedidos/items/x/cancelar'],
 ['MC','POST','pagos'],['C','GET','pagos/x'],['C','PATCH','pagos/x/verificar'],
 ['MC','GET','juegos/activos'],['MC','GET','juegos/sesiones'],['M','POST','juegos/iniciar'],['M','PUT','juegos/x/terminar'],
 ['A','PUT','inventario/actualizar-stock'],['A','GET','inventario/movimientos'],['MB','GET','inventario/alertas'],['MB','GET','inventario/alertas/x'],['MB','PATCH','inventario/alertas/x/vista'],['MB','PATCH','inventario/alertas/x/silenciar'],['MB','PATCH','inventario/alertas/x/reactivar'],['MB','PATCH','inventario/alertas/x/resolver'],
 ['A','POST','mermas'],['B','GET','mermas'],['B','GET','mermas/motivos'],['A','GET','mermas/refrigeradores'],
 ['A','GET','proveedores'],['A','POST','proveedores'],['A','PUT','proveedores/x'],
 ['A','GET','compras'],['A','GET','compras/x'],['A','POST','compras'],['A','PATCH','compras/x/recibir'],['A','PATCH','compras/x/cancelar'],['A','PATCH','compras/x/cancelar-pendiente'],['A','GET','compras/x/recepciones'],['A','GET','compras/x/recepciones/y'],['A','PATCH','compras/x/recepciones/y/reversar'],
 ['MC','GET','clientes'],['MC','GET','clientes/x'],['MC','POST','clientes/registrar'],['A','PUT','clientes/x'],
 ['A','POST','ventas/pedido'],['C','POST','ventas/facturar'],['C','GET','ventas/comprobantes'],['C','GET','ventas/comprobantes/x'],
 ['C','GET','cierres-caja/resumen'],['C','POST','cierres-caja'],['C','GET','cierres-caja'],['C','GET','cierres-caja/x'],
 ['MB','GET','kanban/simulado'],['MB','GET','kanban/tablero'],['MB','PUT','kanban/x/estado'],
 ['MC','POST','sesiones-division'],['MC','GET','sesiones-division/x'],['MC','POST','sesiones-division/x/asignar-items'],
 ['A','POST','usuarios/registrar'],['A','PUT','usuarios/x/estado']
];
const groups={A:['Administrador','SuperAdmin'],M:['Administrador','SuperAdmin','Mesero','Mesera'],C:['Administrador','SuperAdmin','Cajero'],MC:['Administrador','SuperAdmin','Mesero','Mesera','Cajero'],ALL:['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero'],B:['Administrador','SuperAdmin','Bartender'],MB:['Administrador','SuperAdmin','Mesero','Mesera','Bartender']};

test('matriz HTTP completa con identidad y cambios de rol en MySQL temporal', {skip:process.env.RUN_MYSQL_ROLES_TESTS!=='1'},async t=>{
  require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
  const connection=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  const previous=process.env.JWT_SECRET; process.env.JWT_SECRET='secreto-exclusivo-roles-pruebas-1234567890';
  let server;
  const load=(file,deps)=>{const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module,exports:module.exports,process,Buffer,console:{log(){},error(){}},require:name=>Object.hasOwn(deps,name)?deps[name]:require(name)});return module.exports;};
  try {
    for(const table of ['roles','usuarios']){
      await connection.query('CREATE TEMPORARY TABLE copia_roles_'+table+' LIKE '+table);
      await connection.query('CREATE TEMPORARY TABLE '+table+' LIKE copia_roles_'+table);
    }
    const roles=['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero','Desconocido'];
    for(let i=0;i<roles.length;i++)await connection.query('INSERT INTO roles (id,nombre,activo) VALUES (?,?,NULL)',[i+1,roles[i]]);
    await connection.query("INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id) VALUES ('u1','Prueba','roles@example.invalid','no-login','activo',1)");
    const auth=load('../src/middleware/authMiddleware.js',{'../config/db':{promise:()=>({query:(sql,params)=>connection.query(sql,params)})}});
    let hits=0;
    const controllers=new Proxy({}, {get:(_,prop)=> prop==='accion'?()=>((req,res)=>{hits++;res.json({usuario:req.usuario??null});}):(req,res)=>{hits++;res.json({usuario:req.usuario??null});}});
    const app=express(), listen=app.listen.bind(app);app.listen=()=>{};
    const deps={express:Object.assign(()=>app,{json:express.json}),cors:()=>((req,res,next)=>next()),dotenv:{config(){}},'./config/db':{},'./middleware/authMiddleware':auth};
    const index=fs.readFileSync(path.join(__dirname,'../src/index.js'),'utf8');
    for(const [,route] of index.matchAll(/require\('(\.\/routes\/[^']+)'\)/g)){
      const file='../src/'+route.slice(2)+'.js';
      const code=fs.readFileSync(path.join(__dirname,file),'utf8');
      const routerDeps={'../middleware/authMiddleware':auth,'../middleware/rolesMiddleware':{autorizarRoles}};
      for(const [,controller] of code.matchAll(/require\('(\.\.\/controllers\/[^']+)'\)/g))routerDeps[controller]=controllers;
      deps[route]=load(file,routerDeps);
    }
    load('../src/index.js',deps);
    server=await new Promise(resolve=>{const s=listen(0,'127.0.0.1',()=>resolve(s));});
    const base='http://127.0.0.1:'+server.address().port;
    // Deliberately misleading token role: middleware must use MySQL, not this claim.
    const token=jwt.sign({rol:'Administrador'},process.env.JWT_SECRET,{algorithm:'HS256',issuer:'dondejuanca',subject:'u1',expiresIn:3600});
    const request=async(method,url,authenticated=true)=>fetch(base+url,{method,headers:authenticated?{Authorization:'Bearer '+token}:{}});
    await t.test('todas las rutas operativas sin JWT responden 401',async()=>{
      for(const [,method,url] of cases)assert.equal((await request(method,'/api/'+url,false)).status,401,method+' '+url);
    });
    for(let i=0;i<roles.length;i++)await t.test('matriz completa: '+roles[i],async()=>{
      await connection.query('UPDATE usuarios SET roles_id=? WHERE id=?',[i+1,'u1']);
      for(const [group,method,url] of cases){
        const allowed=groups[group].includes(roles[i]),before=hits;
        const response=await request(method,'/api/'+url);
        assert.equal(response.status,allowed?200:403,roles[i]+' '+method+' '+url);
        assert.equal(hits-before,allowed?1:0);
        if(allowed)assert.equal((await response.json()).usuario.rol,roles[i]);
      }
    });
    await t.test('ra?z, login y OTP siguen p?blicos',async()=>{
      for(const [method,url] of [['GET','/'],['POST','/api/usuarios/login'],['POST','/api/usuarios/auth/otp/solicitar']])assert.equal((await request(method,url,false)).status,200,url);
    });
    await t.test('mismo token pierde y recupera acceso al cambiar el rol actual',async()=>{
      await connection.query('UPDATE usuarios SET roles_id=1');assert.equal((await request('PUT','/api/inventario/actualizar-stock')).status,200);
      await connection.query('UPDATE usuarios SET roles_id=3');assert.equal((await request('PUT','/api/inventario/actualizar-stock')).status,403);
      await connection.query('UPDATE usuarios SET roles_id=2');assert.equal((await request('PUT','/api/inventario/actualizar-stock')).status,200);
    });
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve));await connection.end();
    if(previous===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;
  }
});
