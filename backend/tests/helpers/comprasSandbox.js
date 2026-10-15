const mysql=require('mysql2/promise'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const migraciones=['v2.31_compras_recepciones_parciales.sql','v2.32_productos_version_inventario.sql','v2.33_create_recepciones_compra.sql','v2.34_create_historial_costos_recepciones.sql'];
const ejecutarSQL=async(c,file)=>{
 const sql=fs.readFileSync(path.join(__dirname,'../../database',file),'utf8');
 if(sql.includes('DELIMITER $$')){const [antes,resto]=sql.split('DELIMITER $$');if(antes.trim())await c.query(antes);const [rutinas,despues]=resto.split('DELIMITER ;');for(const bloque of rutinas.split('$$').filter(x=>x.trim()))await c.query(bloque.trim());if(despues?.trim())await c.query(despues);}
 else await c.query(sql);
};
const aplicar=async c=>{
 for(const file of migraciones){
  await ejecutarSQL(c,file);
 }
};
const crear=async(opciones={})=>{
 require('dotenv').config({path:path.join(__dirname,'../../.env'),quiet:true});
 const config={host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,multipleStatements:true};
 const admin=await mysql.createConnection(config),db='dj_test_compras_'+randomUUID().replaceAll('-','');
 let c;
 try{
  const [tablas]=await admin.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE'",[process.env.DB_NAME]);
  await admin.query('CREATE DATABASE '+db+' CHARACTER SET utf8 COLLATE utf8_general_ci');
  const quote=s=>'`'+s.replaceAll('`','``')+'`';
  for(const t of tablas.filter(t=>!['recepciones_compra','recepcion_compra_items','historial_costos_recepciones','alertas_inventario_historial','sesiones_mesa','rondas_consumo'].includes(t.TABLE_NAME)))await admin.query('CREATE TABLE '+db+'.'+quote(t.TABLE_NAME)+' LIKE '+quote(process.env.DB_NAME)+'.'+quote(t.TABLE_NAME));
  c=await mysql.createConnection({...config,database:db});
  // Normalizar solo las COPIAS desechables: la BD instalada puede estar migrada.
  for(const [tabla,columnas,indices] of [
    ['compras',['modelo_recepcion'],['idx_compras_fecha_id']],
    ['compra_items',['cantidad_cancelada'],[]],
    ['productos',['version_inventario'],[]],
    ['alertas_inventario',['producto_abierto','modelo_episodio','stock_observado','stock_minimo','actualizado_en','resuelto_en','vista_por','silenciada_por','resuelta_por'],['uq_alerta_producto_abierto','idx_alertas_estado_fecha','idx_alertas_producto_fecha']]
  ]){
    const [checks]=await c.query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND CONSTRAINT_TYPE='CHECK'",[db,tabla]);
    for(const r of checks)if(['chk_compra_items_cancelada','chk_alerta_episodio_v2'].includes(r.CONSTRAINT_NAME))await c.query('ALTER TABLE '+tabla+' DROP CONSTRAINT '+r.CONSTRAINT_NAME);
    const [idx]=await c.query('SHOW INDEX FROM '+tabla);for(const nombre of indices)if(idx.some(i=>i.Key_name===nombre))await c.query('ALTER TABLE '+tabla+' DROP INDEX '+nombre);
    const [cols]=await c.query('SHOW COLUMNS FROM '+tabla);for(const columna of columnas)if(cols.some(x=>x.Field===columna))await c.query('ALTER TABLE '+tabla+' DROP COLUMN '+columna);
  }
  await aplicar(c);
  if(opciones.participantes !== false){await ejecutarSQL(c,'v2.37_participantes_pedidos.sql');await ejecutarSQL(c,'v2.38_participantes_temporales_homonimos.sql');await ejecutarSQL(c,'v2.39_sesiones_mesa.sql');await ejecutarSQL(c,'v2.40_rondas_consumo.sql');}
  if(opciones.alertas)await ejecutarSQL(c,'v2.35_alertas_inventario_episodios.sql');
  return {connection:c,config:{...config,database:db},close:async()=>{await c.end();await admin.query('DROP DATABASE '+db);await admin.end();}};
 }catch(e){if(c)await c.end();if(/^dj_test_compras_[a-f0-9]{32}$/.test(db))await admin.query('DROP DATABASE IF EXISTS '+db);await admin.end();throw e;}
};
module.exports={crear,aplicar,migraciones,ejecutarSQL};
