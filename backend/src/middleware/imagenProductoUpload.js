const multer = require('multer');
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:0,parts:1}}).single('imagen');
module.exports=(req,res,next)=>upload(req,res,e=>{
  if(!e)return next();
  return res.status(e.code==='LIMIT_FILE_SIZE'?413:400).json({error:e.code==='LIMIT_FILE_SIZE'?'La imagen supera el máximo de 5 MB.':'Envía únicamente un archivo en el campo imagen.'});
});
