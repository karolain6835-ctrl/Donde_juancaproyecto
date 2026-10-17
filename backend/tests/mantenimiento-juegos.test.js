const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {cambiarEstado}=require('../src/services/mantenimientoJuegosService');
function fixture(estado='disponible',active=false){
 const calls=[];let stored=estado,fail=false,saved;const historic=[{id:'historica',estado:'cerrada',costo_total:'1000.00'}];
 const c={async beginTransaction(){saved=stored;calls.push(['BEGIN']);},async commit(){calls.push(['COMMIT']);},async rollback(){stored=saved;calls.push(['ROLLBACK']);},async end(){},async query(sql,args){calls.push([sql,args]);
  if(sql.startsWith('SELECT id,nombre,tipo,estado'))return [[{id:'a',nombre:'Billar',tipo:'billar',estado:stored}]];
  if(sql.startsWith('SELECT id FROM sesiones_juego'))return [active?[{id:'s'}]:[]];
  if(sql.startsWith('UPDATE activos_juego')){stored=args[0];return [{affectedRows:1}];}
  if(sql.includes('INSERT INTO auditoria')&&fail)throw Error('auditoria falló');
  if(sql.startsWith('SELECT id,estado FROM mesas'))return [[{id:'m',estado:'ocupada'}]];
  if(sql.startsWith('SELECT sesion_mesa_id'))return [[{sesion_mesa_id:'v'}]];
  if(sql.startsWith('SELECT id,estado,tipo'))return [[{id:'a',estado:stored,tipo:'billar',precio_hora:'1000.00'}]];
  return [{affectedRows:1}];
 }};
 return {c,calls,historic,get estado(){return stored;},set fail(v){fail=v;}};
}
function controller(f){const mod={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers/juegosController.js'),'utf8'),{module:mod,exports:mod.exports,console:{error(){}},require:n=>n==='mysql2'?{createConnection:()=>({promise:()=>f.c})}:n==='../config/db'?{dbConfig:{}}:n==='../services/liquidacionService'?{bloquearPedido:async()=>({id:'p',mesas_id:'m',estado:'abierto'})}:n==='../services/sesionesMesaService'?{validarSesionPedido:async()=>{},asegurarSesion:async()=>{}}:n.startsWith('../')?require(path.join(__dirname,'../src/controllers',n)):require(n)});return mod.exports;}
function response(){return {code:200,status(n){this.code=n;return this;},json(body){this.body=body;return this;}};}
test('Mantenimiento persiste, registra historial y auditoría del actor; no toca históricos ni stock',async()=>{
 const f=fixture();const history=JSON.stringify(f.historic);
 assert.equal((await cambiarEstado(f.c,'a',{estado:'mantenimiento'},'actor')).estado,'mantenimiento');
 assert.equal((await cambiarEstado(f.c,'a',{estado:'disponible'},'actor')).estado,'disponible');
 assert.equal(f.estado,'disponible');assert.equal(JSON.stringify(f.historic),history);
 assert.equal(f.calls.filter(([sql])=>sql.includes('INSERT INTO historial_estados_activo')).length,2);
 assert.ok(f.calls.filter(([sql])=>sql.includes('INSERT INTO auditoria')).every(([,args])=>args.at(-1)==='actor'));
 assert.ok(f.calls.some(([sql])=>sql.includes('activos_juego')&&sql.includes('FOR UPDATE')));
 assert.ok(f.calls.every(([sql])=>!/(UPDATE|INSERT INTO|DELETE FROM) (sesiones_juego|productos|pedidos|movimientos)/.test(sql)));
});
test('Sesión activa y ocupado impiden mantenimiento; reintento mismo estado no duplica historial',async()=>{
 for(const f of [fixture('disponible',true),fixture('ocupado')])await assert.rejects(()=>cambiarEstado(f.c,'a',{estado:'mantenimiento'},'u'),e=>e.status===409);
 const f=fixture('mantenimiento');await cambiarEstado(f.c,'a',{estado:'mantenimiento'},'u');assert.ok(f.calls.every(([sql])=>!sql.startsWith('INSERT')));
});
test('Validación: estados reales, ID, campos extra e inexistente',async()=>{
 for(const body of [{estado:'ocupado'},{estado:'fuera_de_servicio'},{estado:'mantenimiento',usuarios_id:'otro'},{}])await assert.rejects(()=>cambiarEstado(fixture().c,'a',body,'u'),e=>e.status===400);
 await assert.rejects(()=>cambiarEstado(fixture().c,'',{estado:'disponible'},'u'),e=>e.status===400);
 await assert.rejects(()=>cambiarEstado({query:async()=>[[]]},'x',{estado:'mantenimiento'},'u'),e=>e.status===404);
});
test('Controlador usa transacción, actor JWT y rollback si auditoría falla',async()=>{
 const f=fixture(),ctrl=controller(f);let res=response();await ctrl.cambiarEstadoActivo({usuario:{id:'jwt-actor'},params:{id:'a'},body:{estado:'mantenimiento'}},res);assert.equal(res.code,200);assert.ok(f.calls.some(([sql])=>sql==='COMMIT'));
 f.fail=true;res=response();await ctrl.cambiarEstadoActivo({usuario:{id:'jwt-actor'},params:{id:'a'},body:{estado:'disponible'}},res);assert.equal(res.code,500);assert.equal(f.estado,'mantenimiento');assert.ok(f.calls.some(([sql])=>sql==='ROLLBACK'));
 res=response();await ctrl.cambiarEstadoActivo({params:{id:'a'},body:{estado:'disponible'}},res);assert.equal(res.code,401);
 res=response();await ctrl.cambiarEstadoActivo({usuario:{id:'u'},params:{id:'a'},body:{estado:'disponible',usuarios_id:'otro'}},res);assert.equal(res.code,400);
});
test('Inicio real rechaza juego en mantenimiento antes de crear sesión',async()=>{
 const f=fixture('mantenimiento'),res=response();await controller(f).iniciarJuego({usuario:{id:'u'},body:{activos_juego_id:'a',mesas_id:'m',pedidos_id:'p'}},res);assert.equal(res.code,409);assert.ok(f.calls.every(([sql])=>!sql.startsWith('INSERT')));
});
test('Ruta mantenimiento restringida a administradores',()=>{
 const {autorizarRoles}=require('../src/middleware/rolesMiddleware');
 for(const rol of ['Administrador','SuperAdmin','Mesero','Mesera','Cajero','Bartender']){let next=false;const res=response();autorizarRoles('Administrador','SuperAdmin')({usuario:{id:'u',rol}},res,()=>next=true);assert.equal(next,['Administrador','SuperAdmin'].includes(rol));}
 assert.ok(fs.readFileSync(path.join(__dirname,'../src/routes/juegosRoutes.js'),'utf8').includes("router.patch('/activos/:id/estado', autorizarRoles('Administrador', 'SuperAdmin')"));
});
