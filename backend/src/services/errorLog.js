const codes=new Set(['ER_DUP_ENTRY','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT','ER_NO_REFERENCED_ROW_2','ER_ROW_IS_REFERENCED_2','ER_BAD_FIELD_ERROR','ER_NO_SUCH_TABLE','ER_PARSE_ERROR','ER_ACCESS_DENIED_ERROR','ECONNREFUSED','ECONNRESET','ETIMEDOUT','PROTOCOL_CONNECTION_LOST']);
const names=new Set(['Error','TypeError','RangeError','SyntaxError','ReferenceError']);
// No serializar errores completos: message, stack original, sql, valores y body pueden contener secretos.
function registrarError(context,error,request){
 const record={evento:'error_backend',contexto:typeof context==='string'?context.slice(0,120):'Operación backend',tipo:names.has(error?.name)?error.name:'Error'};
 if(codes.has(error?.code))record.codigo=error.code;
 if(Number.isInteger(error?.status)&&error.status>=400&&error.status<=599)record.estado=error.status;
 if(['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD'].includes(request?.method))record.metodo=request.method;
 // route.path es la plantilla declarada en Express, no originalUrl, params ni query.
 if(typeof request?.route?.path==='string')record.ruta=request.route.path;
 // Traza creada aquí: identifica al llamador sin incluir el mensaje/stack suministrado por el error.
 record.origen=new Error().stack.split('\n').slice(2,5).map(line=>line.trim());
 console.error(record);
}
module.exports={registrarError};
