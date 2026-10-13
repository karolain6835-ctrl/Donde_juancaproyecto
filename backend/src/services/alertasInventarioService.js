const {randomUUID}=require('node:crypto');
const {registrarAuditoria}=require('./auditoriaService');
const error=(status,mensaje)=>Object.assign(new Error(mensaje),{status});
const estados=['activa','vista','silenciada','resuelta'];
const columnas=`SELECT a.id,a.productos_id,p.nombre AS producto,a.stock_observado AS stock_actual,a.stock_minimo,a.tipo,a.estado,
 DATE_FORMAT(a.creado_en,'%Y-%m-%dT%H:%i:%sZ') AS creado_en,
 DATE_FORMAT(a.actualizado_en,'%Y-%m-%dT%H:%i:%sZ') AS actualizado_en,
 DATE_FORMAT(a.resuelto_en,'%Y-%m-%dT%H:%i:%sZ') AS resuelto_en,a.vista_por,a.silenciada_por,a.resuelta_por
 FROM alertas_inventario a LEFT JOIN productos p ON p.id=a.productos_id`;
const id=v=>{if(typeof v!=='string'||!v||v.length>36||v!==v.trim())throw error(400,'ID invalido.');return v;};
const fecha=v=>{
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)||Number(v.slice(0,4))<1000)throw error(400,'Fecha UTC invalida.');
 const d=new Date(v+'Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,19)!==v)throw error(400,'Fecha inexistente.');return v.replace('T',' ');
};
const listar=async(c,q={})=>{
 if(Object.keys(q).some(k=>!['estado','producto_id','tipo','fecha_inicio','fecha_fin','pagina','limite'].includes(k)))throw error(400,'Filtros invalidos.');
 const where=["a.modelo_episodio='v2'"],valores=[];
 if(q.estado!==undefined){if(!estados.includes(q.estado))throw error(400,'Estado invalido.');where.push('a.estado=?');valores.push(q.estado);}
 else where.push("a.estado<>'resuelta'");
 if(q.producto_id!==undefined){where.push('a.productos_id=?');valores.push(id(q.producto_id));}
 if(q.tipo!==undefined){if(!['bajo','agotado'].includes(q.tipo))throw error(400,'Tipo invalido.');where.push('a.tipo=?');valores.push(q.tipo);}
 let inicio,fin;
 if(q.fecha_inicio!==undefined){inicio=fecha(q.fecha_inicio);where.push('a.creado_en>=?');valores.push(inicio);}
 if(q.fecha_fin!==undefined){fin=fecha(q.fecha_fin);where.push('a.creado_en<?');valores.push(fin);}
 if(inicio&&fin&&inicio>=fin)throw error(400,'Periodo invalido.');
 let pagina,limite,offset,paginada=q.pagina!==undefined||q.limite!==undefined;
 if(paginada){const entero=(v,d)=>v===undefined?d:typeof v==='string'&&/^[1-9]\d*$/.test(v)?Number(v):NaN;
  pagina=entero(q.pagina,1);limite=entero(q.limite,20);offset=(pagina-1)*limite;
  if(!Number.isSafeInteger(pagina)||!Number.isSafeInteger(limite)||limite>100||!Number.isSafeInteger(offset))throw error(400,'Paginacion invalida.');}
 const filtro=' WHERE '+where.join(' AND ');
 const [[conteo]]=await c.query('SELECT COUNT(*) AS total FROM alertas_inventario a'+filtro,valores);
 const [alertas]=await c.query(columnas+filtro+" ORDER BY (a.tipo='agotado') DESC,a.stock_observado ASC,a.productos_id ASC,a.creado_en DESC,a.id DESC"+(paginada?' LIMIT ? OFFSET ?':''),paginada?[...valores,limite,offset]:valores);
 return {mensaje:'Alertas de inventario consultadas correctamente.',total_alertas:Number(conteo.total),alertas,
  ...(paginada?{paginacion:{pagina,limite,total:Number(conteo.total),total_paginas:Math.ceil(Number(conteo.total)/limite)}}:{})};
};
const detalle=async(c,alertaId)=>{
 const [[a]]=await c.query(columnas+" WHERE a.id=? AND a.modelo_episodio='v2'",[id(alertaId)]);
 if(!a)throw error(404,'Episodio no encontrado.');
 const [historial]=await c.query("SELECT id,CAST(secuencia AS CHAR) AS secuencia,evento,origen,usuarios_id,cambios_json,DATE_FORMAT(creado_en,'%Y-%m-%dT%H:%i:%sZ') AS creado_en FROM alertas_inventario_historial WHERE alertas_inventario_id=? ORDER BY secuencia",[a.id]);
 for(const h of historial)if(typeof h.cambios_json==='string')h.cambios_json=JSON.parse(h.cambios_json);
 return {...a,historial};
};
const actuar=async(c,alertaId,accion,actor,body)=>{
 if(body!==undefined&&(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length))throw error(400,'Esta accion no recibe campos en el body.');
 const [[ubicacion]]=await c.query("SELECT productos_id FROM alertas_inventario WHERE id=? AND modelo_episodio='v2'",[id(alertaId)]);
 if(!ubicacion)throw error(404,'Episodio no encontrado.');
 const [[p]]=await c.query('SELECT id,cantidad_disponible,stock_minimo FROM productos WHERE id=? FOR UPDATE',[ubicacion.productos_id]);
 if(!p)throw error(409,'Producto inexistente.');
 const [[a]]=await c.query('SELECT id,estado FROM alertas_inventario WHERE id=? FOR UPDATE',[alertaId]);
 const config={vista:{estado:'vista',evento:'alerta_vista',campo:'vista_por',desde:['activa']},silenciar:{estado:'silenciada',evento:'alerta_silenciada',campo:'silenciada_por',desde:['activa','vista']},reactivar:{estado:'activa',evento:'alerta_reactivada',desde:['silenciada']},resolver:{estado:'resuelta',evento:'alerta_resuelta_manualmente',campo:'resuelta_por',desde:['activa','vista','silenciada']}}[accion];
 if(!config)throw error(400,'Accion invalida.');
 if(accion==='resolver'&&p.cantidad_disponible<=p.stock_minimo)throw error(409,'No se puede resolver mientras persista la condicion de alerta.');
 if(a.estado===config.estado)return {mensaje:'El episodio ya tiene ese estado.',alerta:await detalle(c,a.id)};
 if(!config.desde.includes(a.estado))throw error(409,'Transicion de estado no permitida.');
 const [[hora]]=await c.query("SELECT DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%d %H:%i:%s') AS ahora");
 const params=[config.estado,hora.ahora];let sql='UPDATE alertas_inventario SET estado=?,actualizado_en=?';
 if(config.campo){sql+=','+config.campo+'=?';params.push(actor);}
 if(accion==='resolver'){sql+=',resuelto_en=?,stock_observado=?,stock_minimo=?';params.push(hora.ahora,p.cantidad_disponible,p.stock_minimo);}
 sql+=' WHERE id=?';params.push(a.id);
 if((await c.query(sql,params))[0].affectedRows!==1)throw new Error('No se actualizo el episodio.');
 const cambios={estado_anterior:a.estado,estado:config.estado,stock:p.cantidad_disponible,stock_minimo:p.stock_minimo};
 if((await c.query("INSERT INTO alertas_inventario_historial(id,alertas_inventario_id,evento,origen,usuarios_id,cambios_json,creado_en) VALUES (?,?,?,'humano',?,?,?)",[randomUUID(),a.id,config.evento,actor,JSON.stringify(cambios),hora.ahora]))[0].affectedRows!==1)throw new Error('No se registro el historial.');
 await registrarAuditoria(c,actor,'inventario',config.evento,'alertas_inventario',a.id,cambios);
 return {mensaje:'Estado de alerta actualizado correctamente.',alerta:await detalle(c,a.id)};
};
module.exports={listar,detalle,actuar};
