const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),express=require('express');
test('V1: endpoints simulados ausentes del montaje real; rutas reales conservadas',async()=>{
 let server,queries=0,hits=[];const forbidden=()=>{queries++;throw new Error('No consultar BD al retirar mocks.');};
 const load=(file,deps)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module:m,exports:m.exports,process,Buffer,console,require:n=>Object.hasOwn(deps,n)?deps[n]:require(n)});return m.exports;};
 const reales={};
 for(const name of ['kanban','ventas']){
  const actual=load('../src/controllers/'+name+'Controller.js',{'../config/db':{query:forbidden},'../utils/fechaHora':require('../src/utils/fechaHora'),'../services/identidadService':require('../src/services/identidadService'),'../services/comprobantesService':{}});
  assert.equal(actual[name==='kanban'?'obtenerPedidosKanban':'crearPedido'],undefined);
  const controllers=Object.fromEntries(Object.keys(actual).map(key=>[key,(req,res)=>{hits.push(name+'.'+key);res.json({handler:key});}]));
  reales['./routes/'+name+'Routes']=load('../src/routes/'+name+'Routes.js',{['../controllers/'+name+'Controller']:controllers,'../middleware/rolesMiddleware':require('../src/middleware/rolesMiddleware')});
 }
 const auth=(req,res,next)=>{req.usuario={id:'actor-test',rol:'Administrador'};next();};
 const pedidos=express.Router();pedidos.post('/',(req,res)=>{hits.push('pedidos.crear');res.status(201).json({handler:'pedido-real'});});reales['./routes/pedidosRoutes']=pedidos;
 const app=express(),listen=app.listen.bind(app);app.listen=()=>{};
 const deps={express:Object.assign(()=>app,{json:express.json}),cors:()=>((req,res,next)=>next()),dotenv:{config(){}},'./config/db':{},'./middleware/authMiddleware':auth,...reales};
 deps['./middleware/errorMiddleware']=require('../src/middleware/errorMiddleware');
 const index=fs.readFileSync(path.join(__dirname,'../src/index.js'),'utf8');for(const [,r]of index.matchAll(/require\('(\.\/routes\/[^']+)'\)/g))if(!deps[r])deps[r]=express.Router();
 try{load('../src/index.js',deps);server=await new Promise(resolve=>{const s=listen(0,'127.0.0.1',()=>resolve(s));});
 for(const [method,url]of [['GET','/api/kanban/simulado'],['POST','/api/ventas/pedido']]){const r=await fetch('http://127.0.0.1:'+server.address().port+url,{method});assert.equal(r.status,404);assert.doesNotMatch(await r.text(),/PED-999|PED-101|items_registrados/);}
 assert.deepEqual(hits,[]);assert.equal(queries,0);
 for(const [method,url]of [['GET','/api/kanban/pedidos'],['GET','/api/kanban/tablero'],['PATCH','/api/kanban/pedidos/p/aceptar'],['PATCH','/api/kanban/pedidos/p/despachar-todo'],['PUT','/api/kanban/i/estado'],['POST','/api/pedidos'],['POST','/api/ventas/facturar']]){const r=await fetch('http://127.0.0.1:'+server.address().port+url,{method});assert.equal(r.status,method==='POST'&&url==='/api/pedidos'?201:200,url);}
 assert.equal(hits.length,7);
 }finally{if(server)await new Promise(resolve=>server.close(resolve));}
});
