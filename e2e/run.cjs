const path=require('node:path');const net=require('node:net');
const fs=require('node:fs');
const {spawn}=require('node:child_process');const {randomUUID,randomBytes}=require('node:crypto');
const root=path.join(__dirname,'..');
require('../backend/node_modules/dotenv').config({path:path.join(root,'backend/.env'),quiet:true});
const mysql=require('../backend/node_modules/mysql2/promise');
const bcrypt=require('../backend/node_modules/bcrypt');
const {install,checkManifest}=require('../backend/scripts/instalar-bd-v1');
const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
async function ready(url,child){
 const deadline=Date.now()+30000;
 while(Date.now()<deadline){if(child.exitCode!==null)throw Error('El servidor de prueba terminó antes de estar disponible.');try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,150));}
 throw Error('El servidor de prueba no respondió a tiempo.');
}
async function stop(child){if(!child||child.exitCode!==null)return;await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}
async function main(){
 checkManifest();
 const database='dj_v1_e2e_'+randomUUID().replaceAll('-','');
 const config={host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD};
 const c=await mysql.createConnection(config);let created=false,backend,frontend;
 const mailFile=path.join(__dirname,'test-results','correo-'+randomUUID().replaceAll('-','')+'.log');
 try{
  await c.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8 COLLATE utf8_general_ci');created=true;
  await install(c,database);
  const password=randomBytes(24).toString('base64url'),hash=await bcrypt.hash(password,12);
  for(const [id,rol]of [['admin','Administrador'],['bar','Bartender'],['cash','Cajero']])await c.query('INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) SELECT ?,?,?,?,\'activo\',id FROM roles WHERE nombre=?',['e2e-'+id,'E2E '+rol,'e2e-'+id+'@example.invalid',hash,rol]);
  await c.query("INSERT INTO categorias(id,nombre,activo) VALUES (1,'E2E Categoría',1)");
  await c.query("INSERT INTO proveedores(id,contacto_nombre,estado) VALUES ('e2e-prov','E2E Proveedor','activo')");
  await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id) VALUES ('e2e-product','E2E Producto','E2E-001',2844.44,0,50,50,'activo',1,'e2e-prov')");
  await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('e2e-mesa',77,'disponible',UTC_TIMESTAMP())");
  await c.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('e2e-cliente','E2E Cliente','activo','e2e-admin')");
  await c.query("INSERT INTO activos_juego(id,nombre,tipo,precio_hora,estado) VALUES ('e2e-game','E2E Billar','billar',3600,'disponible')");
  const apiPort=await freePort(),webPort=await freePort();
  fs.mkdirSync(path.dirname(mailFile),{recursive:true});
  const env={...process.env,NODE_ENV:'test',DB_NAME:database,PORT:String(apiPort),JWT_SECRET:randomBytes(48).toString('hex'),E2E_DATABASE:database,E2E_API_URL:'http://127.0.0.1:'+apiPort+'/api',E2E_WEB_URL:'http://127.0.0.1:'+webPort,E2E_PASSWORD:password,
   RECOVERY_HMAC_SECRET:randomBytes(32).toString('hex'),SMTP_HOST:'smtp.example.invalid',SMTP_PORT:'587',SMTP_SECURE:'false',SMTP_USER:'e2e',SMTP_PASSWORD:randomBytes(24).toString('hex'),MAIL_FROM:'correo@example.invalid',E2E_MAIL_FILE:mailFile};
  backend=spawn(process.execPath,['--require',path.join(__dirname,'correo-test-preload.cjs'),'src/index.js'],{cwd:path.join(root,'backend'),env,windowsHide:true,stdio:'ignore'});
  frontend=spawn(process.execPath,[path.join(root,'frontend-app/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(webPort),'--strictPort'],{cwd:path.join(root,'frontend-app'),env:{...env,VITE_API_URL:env.E2E_API_URL},windowsHide:true,stdio:'ignore'});
  await Promise.all([ready('http://127.0.0.1:'+apiPort,backend),ready(env.E2E_WEB_URL,frontend)]);
  console.log('E2E: backend, Vite y base aislados listos.');
  const exitCode=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[require.resolve('@playwright/test/cli'),'test'],{cwd:__dirname,env,windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',code=>resolve(code??1));});
  process.exitCode=exitCode;
 }finally{
  await Promise.all([stop(frontend),stop(backend)]);
  if(fs.existsSync(mailFile))fs.unlinkSync(mailFile);
  if(created&&/^dj_v1_e2e_[a-f0-9]{32}$/.test(database))await c.query('DROP DATABASE `'+database+'`');
  await c.end();console.log('E2E: procesos detenidos y base temporal eliminada.');
 }
}
main().catch(e=>{console.error('Falló la regresión aislada:',e.code||e.name);process.exitCode=1;});
