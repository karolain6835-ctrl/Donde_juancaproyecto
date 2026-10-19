const {registrarError}=require('../services/errorLog');
const internal='Error interno del servidor.';

// Cubre también los controladores callback que ya resuelven sus propios catch.
function protegerErroresInternos(req,res,next){
 const json=res.json;
 res.json=function(body){
  if(this.statusCode>=500){
   registrarError('Respuesta HTTP '+this.statusCode,undefined,req);
   return json.call(this,{error:internal});
  }
  return json.call(this,body);
 };
 next();
}
function manejarError(error,req,res,next){
 registrarError('Middleware global',error,req);
 if(res.headersSent)return next(new Error(internal));
 // body-parser incluye el cuerpo original en el error: nunca devolverlo ni registrarlo.
 if(error?.type==='entity.parse.failed')return res.status(400).json({error:'El cuerpo de la solicitud no contiene JSON válido.'});
 if(error?.type==='entity.too.large')return res.status(413).json({error:'La solicitud es demasiado grande.'});
 if(error?.type==='encoding.unsupported'||error?.type==='charset.unsupported')return res.status(415).json({error:'Formato de solicitud no admitido.'});
 const database=error?.sql!==undefined||error?.sqlMessage!==undefined||/^ER_/.test(error?.code||'');
 if(!database&&[400,401,403,404,409].includes(error?.status)&&typeof error.message==='string')return res.status(error.status).json({error:error.message});
 return res.status(500).json({error:internal});
}
module.exports={protegerErroresInternos,manejarError};
