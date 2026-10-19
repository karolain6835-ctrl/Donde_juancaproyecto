const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
function controller(c){
 const load=(file,overrides)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{module:m,exports:m.exports,console:{error(){}},require:n=>Object.hasOwn(overrides,n)?overrides[n]:require(n)});return m.exports;};
 const utils=load('services/comprasService.js',{'../config/db':{dbConfig:{}},mysql2:{createConnection:()=>({promise:()=>c})}});
 const receipts=load('services/recepcionesCompraService.js',{'./comprasService':utils,'./auditoriaService':{registrarAuditoria:async()=>{}}});
 return load('controllers/comprasController.js',{'../services/comprasService':utils,'../services/recepcionesCompraService':receipts,'../services/identidadService':require('../src/services/identidadService')});
}
const response=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
function connection(query){return {query,commit:async()=>{},rollback:async()=>{},end:async()=>{}};}
test('Filtro de compras valida proveedor inexistente, vacío y paginación',async()=>{
 const run=async(query,provider)=>{const res=response();await controller(connection(async(sql)=>sql.startsWith('SELECT id FROM proveedores')?[provider?[{id:'s'}]:[]]:sql.includes('COUNT(*)')?[[{total:0}]]:sql.startsWith('SELECT')?[[]]:[{}])).obtenerCompras({query},res);return res;};
 assert.equal((await run({proveedores_id:'missing'},false)).code,404);
 const empty=await run({proveedores_id:'s'},true);assert.equal(empty.code,200);assert.equal(empty.body.datos.length,0);
 for(const query of [{pagina:'0'},{limite:'101'},{proveedores_id:' bad'},{proveedores_id:['s']}])assert.equal((await run(query,true)).code,400);
});
test('Consulta parametrizada, sin JOIN multiplicador y orden descendente',async()=>{
 const calls=[];const res=response();await controller(connection(async(sql,args)=>{calls.push([sql,args]);return sql.startsWith('SELECT id FROM proveedores')?[[{id:'s'}]]:sql.includes('COUNT(*)')?[[{total:3}]]:sql.startsWith('SELECT')?[[{id:'purchase'}]]:[{}];})).obtenerCompras({query:{proveedores_id:'s',pagina:'2',limite:'1'}},res);
 assert.equal(res.code,200);assert.equal(res.body.paginacion.total,3);const [sql,args]=calls.find(([sql])=>sql.includes('ORDER BY'));assert.match(sql,/WHERE c.proveedores_id=\? ORDER BY c.creado_en DESC,c.id DESC/);assert.doesNotMatch(sql,/JOIN/);assert.deepEqual(Array.from(args.slice(-3)),['s',1,1]);
});
test('Roles de compras permanecen administrativos',()=>{
 const {autorizarRoles}=require('../src/middleware/rolesMiddleware');for(const rol of ['Administrador','SuperAdmin','Mesero','Mesera','Cajero','Bartender']){let allowed=false;autorizarRoles('Administrador','SuperAdmin')({usuario:{id:'u',rol}},response(),()=>allowed=true);assert.equal(allowed,['Administrador','SuperAdmin'].includes(rol));}
});
test('MySQL temporal: proveedor, exclusión, orden, páginas y costo histórico',{skip:process.env.RUN_MYSQL_HISTORIAL_PROVEEDORES!=='1'},async()=>{
 require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
 const c=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectTimeout:5000});
 try{
  const tables={proveedores:'id VARCHAR(36)',compras:'id VARCHAR(36),estado VARCHAR(25),total_estimado DECIMAL(10,2),total_recibido DECIMAL(10,2),creado_en DATETIME,proveedores_id VARCHAR(36),usuarios_id VARCHAR(36),modelo_recepcion VARCHAR(10)',productos:'id VARCHAR(36),nombre VARCHAR(100)',compra_items:'id VARCHAR(36),compras_id VARCHAR(36),productos_id VARCHAR(36),cantidad INT,precio_unitario DECIMAL(10,2),cantidad_cancelada INT'};
  for(const [table,columns]of Object.entries(tables))await c.query(`CREATE TEMPORARY TABLE ${table} (${columns})`);
  await c.query("INSERT INTO proveedores VALUES ('s'),('other'),('empty')");
  await c.query("INSERT INTO compras VALUES ('old','recibida',100,100,'2026-10-14','s','u','legado'),('new','pendiente',5688.88,0,'2026-10-16','s','u','legado'),('foreign','recibida',200,200,'2026-10-17','other','u','legado')");
  await c.query("INSERT INTO productos VALUES ('p','Producto real')");await c.query("INSERT INTO compra_items VALUES ('i','new','p',2,2844.44,0),('i2','old','p',1,100,0)");
  const ctrl=controller({...connection(c.query.bind(c)),commit:c.commit.bind(c),rollback:c.rollback.bind(c)});
  async function list(proveedor,pagina='1',limite='20'){const r=response();await ctrl.obtenerCompras({query:{proveedores_id:proveedor,pagina,limite}},r);return r;}
  const r=await list('s');assert.equal(r.code,200);assert.deepEqual(Array.from(r.body.datos,x=>x.id),['new','old']);assert.equal(r.body.paginacion.total,2);assert.equal(r.body.datos[0].total_estimado,'5688.88');
  assert.equal((await list('s','2','1')).body.datos[0].id,'old');assert.equal((await list('empty')).body.datos.length,0);assert.equal((await list('missing')).code,404);
  const detail=response();await ctrl.obtenerCompra({params:{id:'new'}},detail);assert.equal(detail.code,200);assert.equal(detail.body.datos.items[0].producto_nombre,'Producto real');assert.equal(String(detail.body.datos.items[0].subtotal),'5688.88');assert.equal(detail.body.datos.items[0].precio_unitario,'2844.44');
 }finally{await c.end();}
});
