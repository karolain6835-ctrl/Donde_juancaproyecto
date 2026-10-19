const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {randomBytes, randomUUID, createHash} = require('node:crypto');
const express = require('express');
const servicio = require('../src/services/recuperacionService');
const {crearCorreo} = require('../src/services/correoRecuperacionService');
const {crearLimiter} = require('../src/middleware/recuperacionLimiter');

test('Recuperación: contratos estrictos y política bcrypt existente sin actor manual', () => {
  assert.equal(servicio.correo({correo: ' Ana@Example.invalid '}), 'ana@example.invalid');
  const reset = {token_recuperacion: 'a'.repeat(64), nueva_contrasena: 'válida', confirmar_contrasena: 'válida'};
  servicio.validar('restablecer', reset);
  for (const body of [{correo:'mal'}, {correo:'a@b.invalid',usuarios_id:'otro'}, {correo:['a@b.invalid']}]) assert.throws(() => servicio.validar('solicitar',body));
  for (const codigo of ['12345','1234567','abcdef',123456]) assert.throws(() => servicio.validar('verificar',{correo:'a@b.invalid',codigo}));
  for (const patch of [{token_recuperacion:'jwt'}, {nueva_contrasena:''}, {nueva_contrasena:'á'.repeat(37)}, {confirmar_contrasena:'otra'}, {roles_id:1}]) assert.throws(() => servicio.validar('restablecer',{...reset,...patch}));
  assert.throws(() => servicio.secreto({}), e => e.status === 503);
  assert.equal(servicio.secreto({RECOVERY_HMAC_SECRET:'x'.repeat(32)}).length,32);
});

test('SMTP: configuración obligatoria, TLS, sin logs y entrega real con contenido controlado', async () => {
  const env = {SMTP_HOST:'smtp.example.invalid',SMTP_PORT:'587',SMTP_SECURE:'false',SMTP_USER:'usuario-prueba',SMTP_PASSWORD:'secreto-prueba',MAIL_FROM:'correo@example.invalid'};
  for (const field of Object.keys(env)) assert.throws(() => crearCorreo({...env,[field]:''}), e => e.status === 503);
  let options,mail;
  const smtp = crearCorreo(env, o => {options=o;return {verify:async()=>true,sendMail:async m=>{mail=m;return {accepted:[m.to],rejected:[]};}};});
  await smtp.preparar(); await smtp.enviar('destino@example.invalid','012345');
  assert.equal(options.requireTLS,true); assert.equal(options.logger,false); assert.equal(options.debug,false);
  assert.equal(options.disableFileAccess,true); assert.equal(options.disableUrlAccess,true);
  assert.match(mail.text,/Donde Juanca/);assert.match(mail.text,/012345/);assert.match(mail.text,/10 minutos/);assert.match(mail.text,/ignora/);
  assert.doesNotMatch(mail.text,/secreto-prueba|usuario-prueba/);
  const bad = crearCorreo(env,()=>({verify:async()=>{throw Error('SMTP_PASSWORD=secreto-prueba');}}));
  await assert.rejects(()=>bad.preparar(), e=>e.status===503&&!e.message.includes('secreto-prueba'));
});

test('Límites por IP/cuenta normalizada, verificación, expiración y capacidad acotada', () => {
  let now=0;const limiter=crearLimiter({ahora:()=>now});
  const invoke=(accion,ip,correo)=>{let status=200;limiter(accion)({ip,body:{correo}},{set(){},status(s){status=s;return this;},json(){}},()=>{});return status;};
  for(let i=0;i<3;i++)assert.equal(invoke('solicitar','ip'+i,' ANA@example.invalid '),200);
  assert.equal(invoke('solicitar','otra','ana@example.invalid'),429);
  for(let i=0;i<5;i++)assert.equal(invoke('verificar','ip'+i,'nadie@example.invalid'),200);
  assert.equal(invoke('verificar','nueva','nadie@example.invalid'),429);
  for(let i=0;i<10;i++)assert.equal(invoke('solicitar','compartida','otro'+i+'@example.invalid'),200);
  assert.equal(invoke('solicitar','compartida','nuevo@example.invalid'),429);
  now+=16*60000;assert.equal(invoke('solicitar','otra','ana@example.invalid'),200);
  const bounded=crearLimiter({maxEntradas:1});let allowed=false;
  bounded('solicitar')({ip:'uno',body:{correo:'a@b.invalid'}},{set(){},status(){return this;},json(){}},()=>{allowed=true;});assert.equal(allowed,false);
});

test('Recuperación HTTP y MariaDB aislada: OTP, token, correo, contraseña y auditoría', {skip:process.env.RUN_MYSQL_RECUPERACION_TESTS!=='1'}, async t => {
  assert.match(process.env.DB_NAME||'',/^dj_v1_regression_[a-f0-9]{32}$/,'Usar node e2e/backend-regression.cjs; nunca la base habitual.');
  const mysql=require('mysql2/promise'),bcrypt=require('bcrypt');
  const config={host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME};
  const c=await mysql.createConnection(config),id=randomUUID(),email='recovery-'+id+'@example.invalid';
  const oldPassword=randomBytes(18).toString('hex'),newPassword=randomBytes(18).toString('hex');
  const saved={RECOVERY_HMAC_SECRET:process.env.RECOVERY_HMAC_SECRET,JWT_SECRET:process.env.JWT_SECRET};
  process.env.RECOVERY_HMAC_SECRET=randomBytes(32).toString('hex');process.env.JWT_SECRET=randomBytes(32).toString('hex');
  let server,clock=0,mail=[],unavailable=false,sendFailure=false,auditFailure=false,dbCalls=0,holdSend=null;
  const logs=[],oldConsole=console.error;console.error=(...args)=>logs.push(JSON.stringify(args));
  const load=(file,deps)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module:m,exports:m.exports,process,Buffer,console,setImmediate,require:n=>Object.hasOwn(deps,n)?deps[n]:require(n)});return m.exports;};
  const connect=()=>{dbCalls++;const connection=require('mysql2').createConnection(config).promise();return {promise:()=>({
    query:(sql,params)=>{if(auditFailure&&sql.includes('INSERT INTO auditoria'))throw Error('Fallo controlado');return connection.query(sql,params);},
    beginTransaction:()=>connection.beginTransaction(),commit:()=>connection.commit(),rollback:()=>connection.rollback(),end:()=>connection.end()
  })};};
  try {
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) SELECT ?,'Recuperación de prueba',?,?,'activo',id FROM roles WHERE nombre='Mesero'",[id,email,await bcrypt.hash(oldPassword,12)]);
    const controller=load('../src/controllers/recuperacionController.js',{'mysql2':{createConnection:connect},'../config/db':{dbConfig:config},'../services/recuperacionService':servicio,'../services/errorLog':require('../src/services/errorLog'),
      '../services/correoRecuperacionService':{crearCorreo:()=>{if(unavailable)throw Object.assign(Error('No fue posible enviar el código. Intenta más tarde.'),{status:503});return {preparar:async()=>{},enviar:async(to,codigo)=>{if(holdSend)await holdSend;if(sendFailure)throw Error('SMTP_PASSWORD=NO-EXPOSICION');mail.push({to,codigo});}};}}});
    const router=load('../src/routes/recuperacionRoutes.js',{'../controllers/recuperacionController':controller,'../middleware/recuperacionLimiter':{crearLimiter:()=>crearLimiter({ahora:()=>clock})}});
    const login=load('../src/controllers/usuariosController.js',{'../config/db':{promise:()=>c}}).loginUsuario;
    const app=express();app.use(express.json());app.use('/api/usuarios/recuperacion',router);app.post('/login',login);
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base='http://127.0.0.1:'+server.address().port;
    const request=async(action,body)=>{clock+=16*60000;const r=await fetch(base+'/api/usuarios/recuperacion/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result={status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};await controller.esperarEnvios();return result;};
    const ask=async()=>{const r=await request('solicitar',{correo:email});assert.equal(r.status,202);return mail.at(-1).codigo;};
    const verify=async codigo=>request('verificar',{correo:email,codigo});
    const reset=async(token,password=newPassword)=>request('restablecer',{token_recuperacion:token,nueva_contrasena:password,confirmar_contrasena:password});
    const row=async()=>{const [[r]]=await c.query('SELECT * FROM recuperaciones_password WHERE usuarios_id=? ORDER BY creado_en DESC,id DESC LIMIT 1',[id]);return r;};
    await t.test('correo real/inexistente: mismo 202 y body, sin ID, OTP, hash ni token',async()=>{
      const a=await request('solicitar',{correo:email.toUpperCase()}),b=await request('solicitar',{correo:'inexistente@example.invalid'});
      assert.equal(a.status,202);assert.deepEqual(a,b);assert.deepEqual(a.body,{mensaje:servicio.mensaje});assert.match(mail[0].codigo,/^\d{6}$/);
      const r=await row();assert.notEqual(r.otp_hash,mail[0].codigo);assert.match(r.otp_hash,/^[a-f0-9]{64}$/);assert.equal(r.enviado,1);assert.equal(r.token_hash,null);assert.equal(r.intentos,0);
      assert.doesNotMatch(JSON.stringify(a),/codigo_simulado|usuarios_id|password|SMTP/);
    });
    await t.test('SMTP no disponible: 503 uniforme antes de consultar usuarios',async()=>{
      unavailable=true;const before=dbCalls;const a=await request('solicitar',{correo:email}),b=await request('solicitar',{correo:'nadie@example.invalid'});unavailable=false;
      assert.equal(a.status,503);assert.deepEqual(a,b);assert.equal(dbCalls,before);
    });
    await t.test('sin secreto de recuperación tampoco se consulta BD al restablecer',async()=>{
      const value=process.env.RECOVERY_HMAC_SECRET,before=dbCalls;delete process.env.RECOVERY_HMAC_SECRET;
      try{const r=await reset('a'.repeat(64));assert.equal(r.status,503);assert.equal(dbCalls,before);}
      finally{process.env.RECOVERY_HMAC_SECRET=value;}
    });
    await t.test('rechazo de destinatario no enumera, invalida código y no filtra credenciales',async()=>{
      sendFailure=true;const a=await request('solicitar',{correo:email}),b=await request('solicitar',{correo:'nadie@example.invalid'});sendFailure=false;
      assert.deepEqual(a,b);assert.equal(a.status,202);assert.equal((await row()).consumido,1);assert.equal((await row()).enviado,0);
    });
    await t.test('la respuesta no espera al destinatario SMTP ni habilita un OTP no enviado',async()=>{
      let release;holdSend=new Promise(r=>release=r);clock+=16*60000;
      try{
        const publicRequest=async correo=>{const r=await fetch(base+'/api/usuarios/recuperacion/solicitar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({correo}),signal:AbortSignal.timeout(5000)});return {status:r.status,body:await r.json()};};
        const a=await publicRequest(email),b=await publicRequest('ausente@example.invalid');assert.equal(a.status,202);assert.deepEqual(a,b);assert.equal((await row()).enviado,0);
      }finally{release();holdSend=null;await controller.esperarEnvios();}
    });
    await t.test('código incorrecto: cinco intentos persistidos, luego incluso el correcto falla',async()=>{
      const code=await ask(),wrong=code==='000000'?'111111':'000000';
      for(let i=1;i<=5;i++){assert.equal((await verify(wrong)).status,400);assert.equal((await row()).intentos,i);}
      assert.equal((await verify(code)).status,400);assert.equal((await row()).consumido,1);
    });
    await t.test('expiración y nueva solicitud invalidan códigos/autorizaciones anteriores',async()=>{
      const code=await ask();await c.query('UPDATE recuperaciones_password SET otp_expira_en=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE usuarios_id=?',[id]);assert.equal((await verify(code)).status,400);
      const first=await verify(await ask());assert.equal(first.status,200);const previous=(await row()).id;
      await ask();assert.equal((await reset(first.body.token_recuperacion)).status,400);
      const [[old]]=await c.query('SELECT consumido FROM recuperaciones_password WHERE id=?',[previous]);assert.equal(old.consumido,1);
    });
    await t.test('OTP correcto una sola vez, token aleatorio con hash y vencimiento propio',async()=>{
      const code=await ask(),r=await verify(code);assert.equal(r.status,200);assert.match(r.body.token_recuperacion,/^[a-f0-9]{64}$/);
      const saved=await row();assert.equal(saved.otp_usado,1);assert.equal(saved.token_hash,createHash('sha256').update(r.body.token_recuperacion).digest('hex'));assert.notEqual(saved.token_hash,r.body.token_recuperacion);
      assert.equal((await verify(code)).status,400);await c.query('UPDATE recuperaciones_password SET token_expira_en=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE id=?',[saved.id]);assert.equal((await reset(r.body.token_recuperacion)).status,400);
    });
    await t.test('no basta email/nueva contraseña; confirmación, bytes y permisos ignorados no pasan',async()=>{
      assert.equal((await request('restablecer',{correo:email,nueva_contrasena:newPassword})).status,400);
      const token=(await verify(await ask())).body.token_recuperacion;
      for(const patch of [{confirmar_contrasena:'distinta'},{nueva_contrasena:'á'.repeat(37)},{usuarios_id:'otro'},{rol:'SuperAdmin'}])assert.equal((await request('restablecer',{token_recuperacion:token,nueva_contrasena:newPassword,confirmar_contrasena:newPassword,...patch})).status,400);
      assert.equal((await reset(token,oldPassword)).status,400);
    });
    await t.test('concurrencia: OTP y token solo tienen un ganador; bcrypt12 y login nuevo',async()=>{
      const code=await ask(),v=await Promise.all([verify(code),verify(code)]);assert.deepEqual(v.map(r=>r.status).sort(),[200,400]);
      const token=v.find(r=>r.status===200).body.token_recuperacion;
      const results=await Promise.all([reset(token),reset(token)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
      const [[u]]=await c.query('SELECT password_hash FROM usuarios WHERE id=?',[id]);assert.equal(bcrypt.getRounds(u.password_hash),12);assert.ok(await bcrypt.compare(newPassword,u.password_hash));
      for(const [contrasena,status]of [[newPassword,200],[oldPassword,401]]){const r=await fetch(base+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({correo:email,contrasena})});assert.equal(r.status,status);}
      assert.equal((await reset(token)).status,400);
    });
    await t.test('cambio autenticado de credencial invalida recuperación pendiente sin tocar perfil',async()=>{
      const code=await ask();await c.query('UPDATE usuarios SET password_hash=? WHERE id=?',[await bcrypt.hash(oldPassword,12),id]);assert.equal((await verify(code)).status,400);
      const token=(await verify(await ask())).body.token_recuperacion;await c.query('UPDATE usuarios SET password_hash=? WHERE id=?',[await bcrypt.hash(newPassword,12),id]);assert.equal((await reset(token)).status,400);
    });
    await t.test('auditoría sin OTP/token/contraseña; fallo auditado revierte password y consumo',async()=>{
      const token=(await verify(await ask())).body.token_recuperacion;
      auditFailure=true;assert.equal((await reset(token,oldPassword)).status,500);auditFailure=false;
      const [[u]]=await c.query('SELECT password_hash FROM usuarios WHERE id=?',[id]);assert.ok(await bcrypt.compare(newPassword,u.password_hash));assert.equal((await row()).consumido,0);
      assert.equal((await reset(token,oldPassword)).status,200);
      const [events]=await c.query('SELECT tipo_evento,cambios_json FROM auditoria WHERE usuarios_id=?',[id]);
      for(const event of ['recuperacion_solicitada','otp_verificado','contrasena_restablecida'])assert.ok(events.some(e=>e.tipo_evento===event));
      for(const e of events)assert.equal(e.cambios_json,'{}');
      assert.ok(!JSON.stringify(logs).includes('NO-EXPOSICION'));assert.ok(!JSON.stringify(logs).includes(token));
      assert.ok(!JSON.stringify(logs).includes(oldPassword));assert.ok(!JSON.stringify(logs).includes(newPassword));
      assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../src/services/recuperacionService.js'),'utf8'),/Math\.random|otp_tokens/);
    });
  } finally {
    console.error=oldConsole;
    if(server)await new Promise(r=>server.close(r));
    await c.query('DELETE FROM recuperaciones_password WHERE usuarios_id=?',[id]);await c.query('DELETE FROM auditoria WHERE usuarios_id=?',[id]);await c.query('DELETE FROM usuarios WHERE id=?',[id]);await c.end();
    for(const [k,v]of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
});
