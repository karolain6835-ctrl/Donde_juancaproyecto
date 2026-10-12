const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const mysql = require('mysql2/promise');

test('alertas calculadas contra MySQL con productos temporales', {
  skip: process.env.RUN_MYSQL_ALERTAS_TESTS !== '1'
}, async t => {
  require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
  const real = await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,
    user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  let fallo = false;
  const modulo = {exports:{}};
  try {
    await real.query('CREATE TEMPORARY TABLE copia_alertas_productos LIKE productos');
    await real.query('CREATE TEMPORARY TABLE productos LIKE copia_alertas_productos');
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers/inventarioController.js'),'utf8'),{
      module:modulo,exports:modulo.exports,
      require:n=>n==='../config/db' ? {promise:()=>({query:sql=>{
        if(fallo) return Promise.reject(new Error('Fallo SQL inyectado'));
        return real.query(sql);
      }})} : require(n),console:{error(){}}
    });
    const consultar = async()=>{
      let r;
      await modulo.exports.obtenerAlertas({}, {status(code){this.code=code;return this;},
        json(body){r={status:this.code,body:JSON.parse(JSON.stringify(body))};}});
      return r;
    };
    const producto = async(id,cantidad,minimo,estado='activo')=>real.query(`INSERT INTO productos
      (id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id)
      VALUES (?,?,?,100,50,?,?,?,1,'prov-test','hist-test')`,[id,`Producto ${id}`,id,cantidad,minimo,estado]);
    for(const [nombre,cantidad,minimo,tipo] of [
      ['por encima',11,10,null],['igual',10,10,'bajo'],['por debajo',9,10,'bajo'],
      ['cero',0,10,'agotado'],['negativo',-1,10,'agotado']
    ]) await t.test(nombre,async()=>{
      await real.query('DELETE FROM productos');await producto('prueba',cantidad,minimo);
      const r=await consultar();assert.equal(r.status,200);
      assert.equal(r.body.total_alertas,tipo?1:0);
      if(tipo) assert.deepEqual(r.body.alertas,[{productos_id:'prueba',producto:'Producto prueba',stock_actual:cantidad,stock_minimo:minimo,tipo}]);
      else assert.deepEqual(r.body.alertas,[]);
    });
    await t.test('multiples alertas, total, orden y desempate por ID',async()=>{
      await real.query('DELETE FROM productos');
      for(const [id,n] of [['b',2],['z',-2],['a',2],['c',0],['d',8],['sin-alerta',11]]) await producto(id,n,10);
      const r=await consultar();assert.equal(r.body.total_alertas,5);
      assert.deepEqual(r.body.alertas.map(a=>a.productos_id),['z','c','a','b','d']);
      assert.equal(r.body.mensaje,'Alertas de inventario consultadas correctamente.');
    });
    await t.test('inactivo incluido y minimo negativo sin normalizacion',async()=>{
      await real.query('DELETE FROM productos');
      await producto('inactivo',2,10,'inactivo');
      await producto('negativo',-3,-2);await producto('no-cumple',0,-2);
      const r=await consultar();assert.deepEqual(r.body.alertas.map(a=>a.productos_id),['negativo','inactivo']);
    });
    await t.test('respuesta vacia y reposicion elimina condicion sin persistencia',async()=>{
      await real.query('DELETE FROM productos');
      let r=await consultar();assert.equal(r.body.total_alertas,0);assert.deepEqual(r.body.alertas,[]);
      await producto('repuesto',0,10);assert.equal((await consultar()).body.total_alertas,1);
      await real.query("UPDATE productos SET cantidad_disponible=11 WHERE id='repuesto'");
      r=await consultar();assert.equal(r.body.total_alertas,0);assert.deepEqual(r.body.alertas,[]);
    });
    await t.test('error SQL no se presenta como lista vacia',async()=>{
      fallo=true;const r=await consultar();assert.equal(r.status,500);assert.ok(r.body.error);
    });
  } finally {await real.end();}
});
