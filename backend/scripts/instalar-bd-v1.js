const fs=require('node:fs');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const mysql=require('mysql2/promise');
const root=path.join(__dirname,'../database');
const manifest=require('../database/migraciones-v1.json');
const fileHash=bytes=>createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');

// Parser limitado al formato controlado de esta baseline; no ejecuta glob de históricos.
function statements(sql){
 let delimiter=';',buffer='';const result=[];
 for(const line of sql.split(/\r?\n/)){
  if(/^DELIMITER\s+/i.test(line.trim())){if(buffer.trim())throw Error('DELIMITER con sentencia incompleta.');delimiter=line.trim().split(/\s+/)[1];continue;}
  if(!buffer.trim()&&(!line.trim()||line.trim().startsWith('--')))continue;
  buffer+=line+'\n';
  if(line.trimEnd().endsWith(delimiter)){result.push(buffer.trimEnd().slice(0,-delimiter.length));buffer='';}
 }
 if(buffer.trim())throw Error('SQL incompleto.');
 return result;
}
function checkManifest(){
 const known=[...manifest.historicas,manifest.baseline];
 const files=fs.readdirSync(root).filter(f=>/^v\d+\.\d+_/i.test(f));
 if(files.length!==known.length||files.some(file=>!known.some(e=>e.file===file)))throw Error('Hay migraciones fuera del manifiesto.');
 if(new Set(known.map(e=>e.version)).size!==known.length)throw Error('Versiones duplicadas.');
 for(const e of [...manifest.historicas,manifest.baseline]){
  const bytes=fs.readFileSync(path.join(root,e.file));
  if(fileHash(bytes)!==e.sha256)throw Error('Checksum distinto: '+e.file);
 }
}
async function install(c,database){
 if(!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(database))throw Error('Nombre de base inválido.');
 const [[version]]=await c.query('SELECT VERSION() AS version');
 if(!version.version.includes('MariaDB'))throw Error('La baseline V1 está validada para MariaDB; MySQL requiere validación aparte.');
 const [[objects]]=await c.query('SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=?',[database]);
 const [[routines]]=await c.query('SELECT COUNT(*) AS n FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=?',[database]);
 if(Number(objects.n)||Number(routines.n))throw Error('La base debe estar vacía; no se modifican instalaciones existentes.');
 await c.query('CREATE DATABASE IF NOT EXISTS `'+database+'` CHARACTER SET utf8 COLLATE utf8_general_ci');
 await c.query('USE `'+database+'`');
 for(const file of manifest.plan_instalacion){
  const sql=fs.readFileSync(path.join(root,file),'utf8');
  for(const statement of statements(sql))await c.query(statement);
 }
 return validate(c);
}
async function validate(c){
 const [tables]=await c.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
 if(JSON.stringify(tables.map(t=>t.TABLE_NAME).sort())!==JSON.stringify(manifest.tablas))throw Error('Inventario de tablas incorrecto.');
 for(const table of manifest.tablas){
  const [[ddl]]=await c.query('SHOW CREATE TABLE `'+table+'`');
  const hash=createHash('sha256').update(ddl['Create Table'].replace(/ AUTO_INCREMENT=\d+/g,'')).digest('hex');
  if(hash!==manifest.definiciones_sha256[table])throw Error('DDL distinto del auditado: '+table);
 }
 const [[fks]]=await c.query("SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_TYPE='FOREIGN KEY'");
 if(Number(fks.n)!==manifest.claves_foraneas)throw Error('Número de FKs incorrecto.');
 const [triggers]=await c.query('SHOW TRIGGERS');
 if(JSON.stringify(triggers.map(t=>t.Trigger).sort())!==JSON.stringify(manifest.triggers))throw Error('Triggers incorrectos.');
 const required={usuarios:['nombre','email','password_hash','roles_id','estado'],productos:['cantidad_disponible','costo_promedio_ponderado','version_inventario','historial_costos_id'],pedidos:['clientes_id','usuarios_id','sesion_mesa_id','total_general'],pedido_items:['pedido_id','pedidos_id','producto_id','productos_id','participante_id','ronda_consumo_id','cantidad_pedida','cantidad_pagada'],sesiones_division_cuentas:['modalidad','estado','sesion_mesa_id','pedido_id','total_objetivo'],division_participantes:['jugadores_id','idempotencia_clave'],pagos:['participante_id','sesion_division_id','total_seleccionado','verificado_en'],sesiones_juego:['pedidos_id','pedido_items_id','fecha_inicio','tarifa_hora_aplicada'],auditoria:['categoria','tipo_evento','entidad_id','cambios_json','resultado'],refrigeradores:['nombre','ubicacion','estado'],configuracion_negocio:['nombreNegocio','actualizado_por']};
 for(const [table,columns] of Object.entries(required)){
  const [actual]=await c.query('SHOW COLUMNS FROM `'+table+'`');
  for(const column of columns)if(!actual.some(c=>c.Field===column))throw Error('Falta '+table+'.'+column);
 }
 const [[routine]]=await c.query("SELECT COUNT(*) AS n FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE() AND ROUTINE_NAME='sincronizar_alerta_inventario'");
 if(Number(routine.n)!==1)throw Error('Falta la rutina de alertas.');
 return {tablas:tables.length,claves_foraneas:Number(fks.n),triggers:triggers.length,rutinas:Number(routine.n)};
}
async function main(args){
 checkManifest();
 const verify=args.length===1&&args[0]==='--verify';
 if(!verify&&!(args.length===2&&args[0]==='--install'))throw Error('Uso: node scripts/instalar-bd-v1.js --verify | --install BASE_NUEVA_VACIA');
 require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
 const database=verify?'dj_v1_verify_'+randomUUID().replaceAll('-',''):args[1];
 if(database===process.env.DB_NAME)throw Error('No se permite usar DB_NAME habitual como destino.');
 const c=await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,connectTimeout:5000});
 let created=false;
 try{
  if(verify){await c.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8 COLLATE utf8_general_ci');created=true;}
  const result=await install(c,database);
  if(verify){
   await c.beginTransaction();
   try{
    let fk=false;try{await c.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en) VALUES ('probe','missing','activa',UTC_TIMESTAMP())");}catch(e){fk=e.errno===1452;}
    if(!fk)throw Error('La FK de sesión no está activa.');
    let check=false;try{await c.query('UPDATE configuracion_negocio SET impuesto=101 WHERE id=1');}catch(e){check=e.errno===4025;}
    if(!check)throw Error('El CHECK de configuración no está activo.');
    await c.query("INSERT INTO categorias(id,nombre) VALUES (1,'Prueba aislada')");
    await c.query("INSERT INTO proveedores(id,estado) VALUES ('probe','activo')");
    await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id) VALUES ('probe','Prueba aislada','PROBE',2844.44,0,2,2,'activo',1,'probe')");
    const [[open]]=await c.query("SELECT estado FROM alertas_inventario WHERE productos_id='probe'");
    if(open?.estado!=='activa')throw Error('El trigger de alta no creó la alerta.');
    await c.query("UPDATE productos SET cantidad_disponible=3 WHERE id='probe'");
    const [[product]]=await c.query("SELECT version_inventario FROM productos WHERE id='probe'");
    const [[closed]]=await c.query("SELECT estado FROM alertas_inventario WHERE productos_id='probe'");
    if(Number(product.version_inventario)!==1||closed?.estado!=='resuelta')throw Error('Triggers de actualización incorrectos.');
   }finally{await c.rollback();}
   // Demuestra que una segunda ejecución se bloquea, no que sea idempotente.
   let rejected=false;try{await install(c,database);}catch(e){rejected=e.message.includes('vacía');}
   if(!rejected)throw Error('No se bloqueó la segunda instalación.');
  }
  console.log(JSON.stringify({modo:verify?'verificacion-aislada':'instalacion',...result}));
 }finally{
  // Solo se elimina el nombre aleatorio creado por esta misma ejecución.
  if(created&&/^dj_v1_verify_[a-f0-9]{32}$/.test(database))await c.query('DROP DATABASE `'+database+'`');
  await c.end();
 }
}
module.exports={statements,checkManifest,install,validate,fileHash};
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
