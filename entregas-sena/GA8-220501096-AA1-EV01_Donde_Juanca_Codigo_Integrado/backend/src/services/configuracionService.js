const {registrarAuditoria}=require('./auditoriaService');
const campos=['nombreNegocio','nit','telefono','email','direccion','horaApertura','horaCierre','impuesto','moneda'];
const invalid=message=>Object.assign(new Error(message),{status:400});
// Contrato completo: el actor se obtiene del JWT, nunca del formulario.
function validar(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!campos.includes(k))||campos.some(k=>!Object.hasOwn(body,k)))throw invalid('Envía únicamente los campos de configuración.');
 const data={};
 for(const [key,max] of Object.entries({nombreNegocio:150,nit:30,telefono:30,email:150,direccion:255,horaApertura:5,horaCierre:5})){
  const v=body[key];if(v!==null&&typeof v!=='string')throw invalid('Valor inválido para '+key+'.');
  data[key]=v===null||!v.trim()?null:v.trim();
  if(data[key]&&([...data[key]].length>max||/[\x00-\x1f]/.test(data[key])))throw invalid('Longitud o formato inválido para '+key+'.');
 }
 if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw invalid('Indica un correo válido.');
 if(data.telefono&&!/^(?=.*\d)[+\d ()-]+$/.test(data.telefono))throw invalid('Indica un teléfono válido.');
 for(const key of ['horaApertura','horaCierre'])if(data[key]&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(data[key]))throw invalid('Indica una hora válida.');
 const tax=body.impuesto;
 if(tax===null||tax==='')data.impuesto=null;
 else {if(!['string','number'].includes(typeof tax)||!/^\d{1,3}(\.\d{1,2})?$/.test(String(tax))||Number(tax)>100)throw invalid('El impuesto debe estar entre 0 y 100, con máximo dos decimales.');data.impuesto=Number(tax).toFixed(2);}
 if(body.moneda!=='COP')throw invalid('La moneda disponible es COP.');data.moneda='COP';return data;
}
async function consultar(c,bloquear=false){
 const [[row]]=await c.query('SELECT '+campos.join(',')+",DATE_FORMAT(actualizado_en,'%Y-%m-%dT%H:%i:%sZ') AS actualizado_en,actualizado_por FROM configuracion_negocio WHERE id=1"+(bloquear?' FOR UPDATE':''));
 if(!row)throw new Error('Configuración no inicializada.');return row;
}
async function actualizar(c,body,actor){
 const data=validar(body),anterior=await consultar(c,true);
 const modificados=campos.filter(k=>String(anterior[k]??'')!==String(data[k]??''));
 if(modificados.length){
  await c.query('UPDATE configuracion_negocio SET '+campos.map(k=>k+'=?').join(',')+',actualizado_en=UTC_TIMESTAMP(),actualizado_por=? WHERE id=1',[...campos.map(k=>data[k]),actor]);
  // Solo nombres de campos; no duplicar valores personales en auditoría.
  await registrarAuditoria(c,actor,'configuracion','configuracion_actualizada','configuracion_negocio','1',{campos_modificados:modificados});
 }
 return consultar(c);
}
module.exports={campos,validar,consultar,actualizar};
