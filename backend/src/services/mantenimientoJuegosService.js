const {randomUUID}=require('node:crypto');
const {registrarAuditoria}=require('./auditoriaService');
const fallo=(status,message)=>Object.assign(new Error(message),{status});

// El bloqueo del activo serializa mantenimiento con inicio y finalización.
async function cambiarEstado(c,id,body,actor){
 if(typeof id!=='string'||!id||id.trim()!==id||id.length>36)throw fallo(400,'Juego inválido.');
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='estado')||!['disponible','mantenimiento'].includes(body.estado))throw fallo(400,'Selecciona disponible o mantenimiento.');
 const [[activo]]=await c.query('SELECT id,nombre,tipo,estado FROM activos_juego WHERE id=? FOR UPDATE',[id]);
 if(!activo)throw fallo(404,'Juego no encontrado.');
 const [activas]=await c.query("SELECT id FROM sesiones_juego WHERE activos_juego_id=? AND estado='activa' FOR UPDATE",[id]);
 if(activas.length||activo.estado==='ocupado')throw fallo(409,'Finaliza primero la sesión activa antes de cambiar el estado del juego.');
 if(activo.estado===body.estado)return activo;
 if(!['disponible','mantenimiento'].includes(activo.estado))throw fallo(409,'El estado actual del juego no permite este cambio.');
 const [r]=await c.query('UPDATE activos_juego SET estado=? WHERE id=?',[body.estado,id]);
 if(r.affectedRows!==1)throw new Error('No se actualizó el juego.');
 const [h]=await c.query('INSERT INTO historial_estados_activo (id,estado_anterior,estado_nuevo,activos_juego_id,usuarios_id) VALUES (?,?,?,?,?)',[randomUUID(),activo.estado,body.estado,id,actor]);
 if(h.affectedRows!==1)throw new Error('No se registró el historial.');
 await registrarAuditoria(c,actor,'juegos','estado_juego_actualizado','activos_juego',id,{antes:{estado:activo.estado},despues:{estado:body.estado}});
 return {...activo,estado:body.estado};
}
module.exports={cambiarEstado};
