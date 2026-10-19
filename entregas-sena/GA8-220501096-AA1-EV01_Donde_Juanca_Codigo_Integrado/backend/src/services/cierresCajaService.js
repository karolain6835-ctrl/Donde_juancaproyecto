const mysql = require('mysql2');
const db = require('../config/db');
const { randomUUID } = require('node:crypto');
const { centavos } = require('./liquidacionService');
const error = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const id = valor => {
  if (typeof valor !== 'string' || !valor || valor.length > 36 || valor.trim() !== valor) throw error(400, 'ID inválido.');
  return valor;
};
const fecha = valor => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(valor) || Number(valor.slice(0,4)) < 1000) throw error(400,'Fecha UTC inválida; usa YYYY-MM-DDTHH:mm:ss.');
  const d = new Date(`${valor}Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,19) !== valor) throw error(400,'Fecha UTC inexistente.');
  return valor.replace('T',' ');
};
const periodo = b => {
  const inicio=fecha(b.fecha_inicio),fin=fecha(b.fecha_fin);
  if(inicio>=fin) throw error(400,'fecha_inicio debe ser anterior a fecha_fin.');
  return [inicio,fin];
};
const dinero = n => {
  const absoluto=n<0n?-n:n;
  if(absoluto>999999999999n) throw error(409,'Importe fuera de DECIMAL(12,2).');
  return `${n<0n?'-':''}${absoluto/100n}.${String(absoluto%100n).padStart(2,'0')}`;
};
const importeReal = v => {
  if(!['string','number'].includes(typeof v) || !/^\d{1,10}(\.\d{1,2})?$/.test(String(v))) throw error(400,'total_efectivo_real debe ser decimal no negativo con hasta dos decimales.');
  return centavos(String(v));
};
const escrito = r => {if(r.affectedRows!==1)throw new Error('No se escribió exactamente una fila.');};
const ejecutar = async(res,operacion,lectura=false)=>{
  let c,abierta=false;
  try{
    c=mysql.createConnection(db.dbConfig).promise();
    if(lectura){await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');}
    else await c.beginTransaction();
    abierta=true;const r=await operacion(c);await c.commit();abierta=false;
    return res.status(r.status||200).json(r.body);
  }catch(e){
    if(abierta){try{await c.rollback();}catch(r){console.error('Rollback cierre:', new Error('Fallo interno; detalles sensibles omitidos.').stack);}}
    if(['ER_DUP_ENTRY','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(e.code))return res.status(409).json({error:'Conflicto concurrente; vuelve a consultar el resumen antes de intentar cerrar.'});
    if(!e.status)console.error('Error cierre:', new Error('Fallo interno; detalles sensibles omitidos.').stack);
    return res.status(e.status||500).json({error:e.status?e.message:'No se pudo completar la operación de cierre.'});
  }finally{if(c){try{await c.end();}catch(e){console.error('Cierre conexión caja:', new Error('Fallo interno; detalles sensibles omitidos.').stack);}}}
};
const elegibles=async(c,inicio,fin,bloquear=false)=>{
  const [pagos]=await c.query(`SELECT p.id,p.metodo_de_pago,CAST(p.total_seleccionado AS CHAR) AS total_seleccionado,
    DATE_FORMAT(p.verificado_en,'%Y-%m-%dT%H:%i:%sZ') AS verificado_en,p.pedidos_id,p.usuarios_id
    FROM pagos p WHERE p.estado='pagado' AND p.verificacion_estado='verificado'
    AND p.verificado_en>=? AND p.verificado_en<?
    AND NOT EXISTS (SELECT 1 FROM cierre_pagos cp WHERE cp.pagos_id=p.id)
    ORDER BY p.id ${bloquear?'FOR UPDATE':''}`,[inicio,fin]);
  return pagos;
};
const resumen=(pagos,inicio,fin)=>{
  const sumas={efectivo:0n,nequi:0n,daviplata:0n,tarjeta:0n};
  for(const p of pagos){
    if(!Object.hasOwn(sumas,p.metodo_de_pago))throw error(409,'Método de pago inconsistente.');
    const monto=centavos(p.total_seleccionado);
    if(monto<=0n)throw error(409,'Pago válido con importe no positivo; requiere conciliación.');
    sumas[p.metodo_de_pago]+=monto;
  }
  const total=Object.values(sumas).reduce((a,n)=>a+n,0n);
  return {mensaje:'Resumen de cierre calculado correctamente.',fecha_inicio:inicio.replace(' ','T'),fecha_fin:fin.replace(' ','T'),
    cantidad_pagos:pagos.length,efectivo_esperado:dinero(sumas.efectivo),total_general:dinero(total),
    por_metodo:Object.fromEntries(Object.entries(sumas).map(([k,v])=>[k,dinero(v)])),pagos};
};
const cabecera=`SELECT id,DATE_FORMAT(fecha,'%Y-%m-%dT%H:%i:%sZ') AS fecha,
  CAST(total_efectivo_esperado AS CHAR) AS total_efectivo_esperado,CAST(total_efectivo_real AS CHAR) AS total_efectivo_real,
  CAST(diferencia_efectivo AS CHAR) AS diferencia_efectivo,CAST(total_general AS CHAR) AS total_general,
  usuarios_id,(SELECT u.nombre FROM usuarios u WHERE u.id=cierres_caja.usuarios_id) AS responsable_nombre,
  reportes_generados_id,DATE_FORMAT(fecha_inicio,'%Y-%m-%dT%H:%i:%sZ') AS fecha_inicio,
  DATE_FORMAT(fecha_fin,'%Y-%m-%dT%H:%i:%sZ') AS fecha_fin FROM cierres_caja`;
const detalle=async(c,cierreId)=>{
  const [[cierre]]=await c.query(`${cabecera} WHERE id=?`,[id(cierreId)]);
  if(!cierre)throw error(404,'Cierre inexistente.');
  const [[reporte]]=await c.query(`SELECT id,tipo,DATE_FORMAT(fecha_inicio,'%Y-%m-%d') AS fecha_inicio,
    DATE_FORMAT(fecha_fin,'%Y-%m-%d') AS fecha_fin,datos_json,archivo_url,
    DATE_FORMAT(creado_en,'%Y-%m-%dT%H:%i:%sZ') AS creado_en,usuarios_id FROM reportes_generados WHERE id=?`,[cierre.reportes_generados_id]);
  if(!reporte)throw error(409,'El cierre no tiene reporte asociado.');
  if(typeof reporte.datos_json==='string')reporte.datos_json=JSON.parse(reporte.datos_json);
  const [pagos]=await c.query(`SELECT id,cierres_caja_id,pagos_id,CAST(importe AS CHAR) AS importe,metodo_de_pago,
    DATE_FORMAT(incluido_en,'%Y-%m-%dT%H:%i:%sZ') AS incluido_en FROM cierre_pagos WHERE cierres_caja_id=? ORDER BY pagos_id`,[cierre.id]);
  return {...cierre,reporte,pagos};
};
const crear=async(c,b,actor)=>{
  if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['fecha_inicio','fecha_fin','total_efectivo_real'].includes(k)))throw error(400,'Body inválido o con campos no permitidos.');
  const [inicio,fin]=periodo(b),real=importeReal(b.total_efectivo_real),usuario=id(actor);
  const [[u]]=await c.query('SELECT id FROM usuarios WHERE id=? LOCK IN SHARE MODE',[usuario]);
  if(!u)throw error(404,'Usuario inexistente.');
  const pagos=await elegibles(c,inicio,fin,true);
  if(!pagos.length)throw error(409,'No hay pagos elegibles para cerrar.');
  const snapshot=resumen(pagos,inicio,fin);
  const diferencia=dinero(real-centavos(snapshot.efectivo_esperado)),realTexto=dinero(real);
  const [[hora]]=await c.query("SELECT DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%d %H:%i:%s') AS ahora");
  const reporteId=randomUUID(),cierreId=randomUUID();
  const [reporte]=await c.query(`INSERT INTO reportes_generados
    (id,tipo,fecha_inicio,fecha_fin,datos_json,archivo_url,creado_en,usuarios_id)
    VALUES (?,'diario',?,?,?,NULL,?,?)`,[reporteId,inicio.slice(0,10),fin.slice(0,10),JSON.stringify({...snapshot,total_efectivo_real:realTexto,diferencia_efectivo:diferencia}),hora.ahora,usuario]);
  escrito(reporte);
  const [cierre]=await c.query(`INSERT INTO cierres_caja
    (id,fecha,total_efectivo_esperado,total_efectivo_real,diferencia_efectivo,total_general,usuarios_id,reportes_generados_id,fecha_inicio,fecha_fin)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,[cierreId,hora.ahora,snapshot.efectivo_esperado,realTexto,diferencia,snapshot.total_general,usuario,reporteId,inicio,fin]);
  escrito(cierre);
  for(const p of pagos){
    const [r]=await c.query(`INSERT INTO cierre_pagos (id,cierres_caja_id,pagos_id,importe,metodo_de_pago,incluido_en)
      VALUES (?,?,?,?,?,?)`,[randomUUID(),cierreId,p.id,dinero(centavos(p.total_seleccionado)),p.metodo_de_pago,hora.ahora]);escrito(r);
  }
  return {status:201,body:{mensaje:'Cierre de caja creado correctamente.',cierre:await detalle(c,cierreId)}};
};
const entero=(v,d,max)=>{if(v===undefined)return d;if(typeof v!=='string'||! /^[1-9]\d*$/.test(v)||!Number.isSafeInteger(Number(v))||Number(v)>max)throw error(400,'Paginación inválida.');return Number(v);};
const listar=async(c,q)=>{
  const pagina=entero(q.pagina,1,Number.MAX_SAFE_INTEGER),limite=entero(q.limite,20,100),offset=(pagina-1)*limite;
  if(!Number.isSafeInteger(offset))throw error(400,'Paginación fuera de rango.');
  const filtros=[],valores=[];
  if(q.usuarios_id!==undefined){filtros.push('usuarios_id=?');valores.push(id(q.usuarios_id));}
  if(q.fecha_inicio!==undefined&&q.fecha_fin!==undefined)periodo(q);
  // Filtra por instante de generación del cierre, no por su período de cobros.
  if(q.fecha_inicio!==undefined){filtros.push('fecha>=?');valores.push(fecha(q.fecha_inicio));}
  if(q.fecha_fin!==undefined){filtros.push('fecha<?');valores.push(fecha(q.fecha_fin));}
  const where=filtros.length?` WHERE ${filtros.join(' AND ')}`:'';
  const [[r]]=await c.query(`SELECT COUNT(*) AS total FROM cierres_caja${where}`,valores);
  const [datos]=await c.query(`${cabecera}${where} ORDER BY fecha DESC,id DESC LIMIT ? OFFSET ?`,[...valores,limite,offset]);
  const [responsables]=await c.query('SELECT DISTINCT u.id,u.nombre FROM cierres_caja cc JOIN usuarios u ON u.id=cc.usuarios_id ORDER BY u.nombre,u.id');
  return {body:{mensaje:'Cierres consultados correctamente.',pagina,limite,total:r.total,datos,responsables}};
};
module.exports={ejecutar,crear,listar,detalle,elegibles,resumen,periodo};
