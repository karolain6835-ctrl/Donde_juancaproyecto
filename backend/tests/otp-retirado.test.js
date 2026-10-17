const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),express=require('express');
test('V1 OTP retirado: montaje real responde 404 uniforme, sin SQL ni generacion',async()=>{
 let queries=0,generated=0,server;
 const forbidden=()=>{queries++;throw new Error('No debe consultar la base de datos.');};
 const load=(file,deps)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module:m,exports:m.exports,process,Buffer,console,Math:Object.assign(Object.create(Math),{random:()=>{generated++;throw new Error('No debe generar OTP.');}}),require:n=>Object.hasOwn(deps,n)?deps[n]:require(n)});return m.exports;};
 const users=load('../src/controllers/usuariosController.js',{'../config/db':{query:forbidden,promise:()=>({query:forbidden})}});
 assert.equal(users.solicitarOTP,undefined);
 const source=fs.readFileSync(path.join(__dirname,'../src/controllers/usuariosController.js'),'utf8');assert.doesNotMatch(source,/codigo_simulado|otp_tokens|Math\.random/);
 const router=load('../src/routes/usuariosRoutes.js',{'../controllers/usuariosController':users,'../controllers/perfilController':{consultar:forbidden,actualizar:forbidden,password:forbidden},'../middleware/authMiddleware':forbidden,'../middleware/rolesMiddleware':require('../src/middleware/rolesMiddleware')});
 const app=express(),listen=app.listen.bind(app);app.listen=()=>{};
 const deps={express:Object.assign(()=>app,{json:express.json}),cors:()=>((req,res,next)=>next()),dotenv:{config(){}},'./config/db':{query:forbidden},'./middleware/authMiddleware':forbidden,'./routes/usuariosRoutes':router};
 deps['./middleware/errorMiddleware']=require('../src/middleware/errorMiddleware');
 const index=fs.readFileSync(path.join(__dirname,'../src/index.js'),'utf8');for(const [,route]of index.matchAll(/require\('(\.\/routes\/[^']+)'\)/g))if(!deps[route])deps[route]=express.Router();
 try{load('../src/index.js',deps);server=await new Promise(resolve=>{const s=listen(0,'127.0.0.1',()=>resolve(s));});let first;
 for(const body of [{email:'existente@example.invalid'},{email:'no-existe@example.invalid'},{email:''},{}, {email:'mal'}]){
  const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/usuarios/auth/otp/solicitar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const text=await r.text();assert.equal(r.status,404);assert.doesNotMatch(text,/codigo_simulado|token_id|expira_en|example.invalid/);if(first!==undefined)assert.equal(text,first);first=text;
 }
 assert.equal(queries,0);assert.equal(generated,0);
 }finally{if(server)await new Promise(resolve=>server.close(resolve));}
});
