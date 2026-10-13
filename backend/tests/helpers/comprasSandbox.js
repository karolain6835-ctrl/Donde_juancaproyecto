const mysql=require('mysql2/promise'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const migraciones=['v2.31_compras_recepciones_parciales.sql','v2.32_productos_version_inventario.sql','v2.33_create_recepciones_compra.sql','v2.34_create_historial_costos_recepciones.sql'];
const aplicar=async c=>{
 for(const file of migraciones){
  const sql=fs.readFileSync(path.join(__dirname,'../../database',file),'utf8');
  if(sql.includes('DELIMITER $$')){const [antes,resto]=sql.split('DELIMITER $$');await c.query(antes);await c.query(resto.split('$$')[0].trim());}
  else await c.query(sql);
 }
};
const crear=async()=>{
 require('dotenv').config({path:path.join(__dirname,'../../.env'),quiet:true});
 const config={host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,multipleStatements:true};
 const admin=await mysql.createConnection(config),db='dj_test_compras_'+randomUUID().replaceAll('-','');
 let c;
 try{
  const [tablas]=await admin.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE'",[process.env.DB_NAME]);
  await admin.query('CREATE DATABASE '+db+' CHARACTER SET utf8 COLLATE utf8_general_ci');
  const quote=s=>'`'+s.replaceAll('`','``')+'`';
  for(const t of tablas)await admin.query('CREATE TABLE '+db+'.'+quote(t.TABLE_NAME)+' LIKE '+quote(process.env.DB_NAME)+'.'+quote(t.TABLE_NAME));
  c=await mysql.createConnection({...config,database:db});await aplicar(c);
  return {connection:c,config:{...config,database:db},close:async()=>{await c.end();await admin.query('DROP DATABASE '+db);await admin.end();}};
 }catch(e){if(c)await c.end();if(/^dj_test_compras_[a-f0-9]{32}$/.test(db))await admin.query('DROP DATABASE IF EXISTS '+db);await admin.end();throw e;}
};
module.exports={crear,aplicar,migraciones};
