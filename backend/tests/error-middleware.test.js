const test=require('node:test');const assert=require('node:assert/strict');
const express=require('express');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {protegerErroresInternos,manejarError}=require('../src/middleware/errorMiddleware');
const {registrarError}=require('../src/services/errorLog');
const secret='SECRETO_PRUEBA_NO_PUBLICAR';
test('HTTP real: excepciones y 500 locales genéricos, JSON seguro y semántica 4xx',async()=>{
 const app=express();app.use(protegerErroresInternos);app.use(express.json());
 app.get('/throw',async()=>{throw Object.assign(new Error('SELECT password_hash FROM usuarios '+secret),{code:'ER_PARSE_ERROR',sql:'SELECT '+secret,sqlMessage:secret,stack:secret});});
 app.get('/local',(req,res)=>res.status(500).json({ok:false,error:secret,detalles:secret,stack:secret,sql:secret}));
 app.get('/status500',()=>{throw Object.assign(new Error(secret),{status:500});});
 app.get('/sql409',()=>{throw Object.assign(new Error('Duplicate entry '+secret),{status:409,code:'ER_DUP_ENTRY'});});
 for(const status of [400,401,403,404,409])app.get('/expected/'+status,()=>{throw Object.assign(new Error('Mensaje esperado '+status),{status});});
 app.get('/conflict',(req,res)=>res.status(409).json({error:'El pago entra en conflicto con un registro existente.'}));
 app.post('/json',(req,res)=>res.json({ok:true}));app.use(manejarError);
 const logs=[],old=console.error;console.error=(...args)=>logs.push(args);
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const url of ['/throw','/local','/status500','/sql409']){const r=await fetch(base+url);assert.equal(r.status,500);assert.deepEqual(await r.json(),{error:'Error interno del servidor.'});}
  for(const status of [400,401,403,404,409]){const r=await fetch(base+'/expected/'+status);assert.equal(r.status,status);assert.deepEqual(await r.json(),{error:'Mensaje esperado '+status});}
  const conflict=await fetch(base+'/conflict');assert.equal(conflict.status,409);assert.match((await conflict.json()).error,/conflicto/);
  const malformed=await fetch(base+'/json',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},body:'{"password":"'+secret+'",oops'});assert.equal(malformed.status,400);assert.deepEqual(await malformed.json(),{error:'El cuerpo de la solicitud no contiene JSON válido.'});
  assert.ok(logs.length>0);const serialized=JSON.stringify(logs);assert.doesNotMatch(serialized,new RegExp(secret));assert.doesNotMatch(serialized,/SELECT password_hash|sqlMessage|Bearer /);assert.match(serialized,/error_backend/);assert.match(serialized,/ER_PARSE_ERROR/);
 }finally{await new Promise(resolve=>server.close(resolve));console.error=old;}
});
test('Logger no serializa message, stack de entrada, SQL, cuerpos, JWT ni OTP',()=>{
 const logs=[],old=console.error;console.error=(...args)=>logs.push(args);
 try{registrarError('Operación de prueba',{name:secret,message:secret,code:secret,stack:secret,sql:secret,sqlMessage:secret,password:secret,token:secret,otp:secret,body:{password:secret}},{method:'POST',route:{path:'/usuarios/:id'},originalUrl:'/?password='+secret,headers:{authorization:secret},body:{password:secret},params:{id:secret}});}finally{console.error=old;}
 const data=JSON.stringify(logs);assert.doesNotMatch(data,new RegExp(secret));assert.match(data,/origen/);assert.match(data,/Operación de prueba/);
 assert.match(data,/POST/);assert.match(data,/usuarios\/:id/);
});
test('Validadores conservan 400 esperado y no disfrazan excepciones internas como validación',async()=>{
 for(const [file,action]of [['auditoriaController.js','listar'],['configuracionController.js','actualizar'],['perfilController.js','actualizar'],['refrigeradoresController.js','crear']]){
  for(const status of [400,undefined]){
   const error=Object.assign(new Error(status?'Validación conocida.':secret),{status});const m={exports:{}};
   const service=new Proxy({},{get:()=>()=>{throw error;}});
   vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers',file),'utf8'),{module:m,exports:m.exports,require:n=>n.includes('/services/')?service:n==='mysql2'?{createConnection(){assert.fail('No debe consultar SQL');}}:{dbConfig:{}}});
   const res={code:200,status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
   await m.exports[action]({usuario:{id:'u'},body:{},query:{},params:{}},res);
   assert.equal(res.code,status||500);assert.equal(res.body.error,status?'Validación conocida.':'Error interno del servidor.');
  }
 }
});
test('Headers ya enviados: delega un error genérico sin el original sensible',()=>{
 let delegated;const old=console.error;console.error=()=>{};
 try{manejarError(new Error(secret),{}, {headersSent:true},error=>delegated=error);}finally{console.error=old;}
 assert.equal(delegated.message,'Error interno del servidor.');assert.doesNotMatch(delegated.stack,new RegExp(secret));
});
test('Log local de controlador no imprime el error SQL ni credenciales',()=>{
 const logs=[],m={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers/categoriasController.js'),'utf8'),{module:m,exports:m.exports,console:{error:(...args)=>logs.push(args)},require:()=>({query:(sql,cb)=>cb(Object.assign(new Error(secret),{sql:secret,password:secret}))})});
 const res={status(){return this;},json(){}};m.exports.obtenerCategorias({},res);
 assert.ok(logs.length);assert.doesNotMatch(JSON.stringify(logs),new RegExp(secret));
});
test('Montaje protege respuestas antes del parser y maneja excepciones después de rutas',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/index.js'),'utf8');
 assert.ok(source.indexOf('app.use(protegerErroresInternos)')<source.indexOf('app.use(express.json())'));
 assert.ok(source.indexOf('app.use(manejarError)')>source.indexOf("app.use('/api/refrigeradores'"));assert.doesNotMatch(source,/detalles: err.message/);
 const pagos=fs.readFileSync(path.join(__dirname,'../src/controllers/pagosController.js'),'utf8');assert.doesNotMatch(pagos,/detalles: error.message/);
});
