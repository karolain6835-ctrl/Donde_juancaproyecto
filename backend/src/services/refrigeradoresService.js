const {randomUUID}=require('node:crypto');
const {registrarAuditoria}=require('./auditoriaService');
const estados=['activa','mantenimiento','apagada'];
const fallo=(status,message)=>Object.assign(new Error(message),{status});
function validar(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['nombre','ubicacion','estado'].includes(k)))throw fallo(400,'Envía únicamente nombre, ubicación y estado.');
 if(typeof body.nombre!=='string'||!body.nombre.trim()||[...body.nombre.trim()].length>80||/[\x00-\x1f]/.test(body.nombre))throw fallo(400,'Indica un nombre de máximo 80 caracteres.');
 if(body.ubicacion!==undefined&&body.ubicacion!==null&&(typeof body.ubicacion!=='string'||[...body.ubicacion.trim()].length>45||/[\x00-\x1f]/.test(body.ubicacion)))throw fallo(400,'La ubicación admite máximo 45 caracteres.');
 if(!estados.includes(body.estado))throw fallo(400,'Selecciona un estado válido.');
 return {nombre:body.nombre.trim(),ubicacion:body.ubicacion?.trim()||null,estado:body.estado};
}
function validarId(id){if(typeof id!=='string'||!id||id!==id.trim()||id.length>36)throw fallo(400,'Refrigerador inválido.');return id;}
async function listar(c){const [datos]=await c.query('SELECT id,nombre,ubicacion,estado FROM refrigeradores WHERE deleted_at IS NULL ORDER BY nombre,id');return {datos,total:datos.length};}
async function guardar(c,body,actor,id){
 const data=validar(body);let antes;
 if(id){validarId(id);[[antes]]=await c.query('SELECT id,nombre,ubicacion,estado FROM refrigeradores WHERE id=? AND deleted_at IS NULL FOR UPDATE',[id]);if(!antes)throw fallo(404,'Refrigerador no encontrado.');
  await c.query('UPDATE refrigeradores SET nombre=?,ubicacion=?,estado=? WHERE id=?',[data.nombre,data.ubicacion,data.estado,id]);
 }else{id=randomUUID();await c.query('INSERT INTO refrigeradores(id,nombre,ubicacion,estado) VALUES (?,?,?,?)',[id,data.nombre,data.ubicacion,data.estado]);}
 // Catálogo administrativo: no se toca productos ni refrigerador_stock.
 await registrarAuditoria(c,actor,'refrigeradores',antes?'refrigerador_actualizado':'refrigerador_creado','refrigeradores',id,{...(antes?{antes:{nombre:antes.nombre,ubicacion:antes.ubicacion,estado:antes.estado}}:{}),despues:data});
 return {id,...data};
}
module.exports={estados,validar,validarId,listar,guardar};
