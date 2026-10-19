const mysql = require('mysql2');
const db = require('../config/db');
const imagen = require('../services/productoImagenService');
const {registrarAuditoria} = require('../services/auditoriaService');
const {registrarError} = require('../services/errorLog');

function modificar(quitar) {return async(req,res)=>{
  let c,nueva,anterior,committed=false;
  try {
    if(typeof req.params.id!=='string'||!req.params.id.trim()||req.params.id.length>36||Object.keys(req.query||{}).length) return res.status(400).json({error:'Producto inválido.'});
    if(quitar&&((req.body&&Object.keys(req.body).length)||req.file))return res.status(400).json({error:'Esta operación no admite archivos ni otros datos.'});
    const contenido=quitar?null:await imagen.preparar(req.file);
    c=mysql.createConnection(db.dbConfig).promise();await c.beginTransaction();
    const [[producto]]=await c.query('SELECT id,imagen_url FROM productos WHERE id=? FOR UPDATE',[req.params.id]);
    if(!producto){await c.rollback();return res.status(404).json({error:'Producto no encontrado.'});}
    anterior=producto.imagen_url;
    if(!quitar)nueva=await imagen.guardar(contenido);
    await c.query('UPDATE productos SET imagen_url=? WHERE id=?',[nueva||null,producto.id]);
    if(anterior||nueva)await registrarAuditoria(c,req.usuario.id,'productos',quitar?'imagen_producto_eliminada':'imagen_producto_actualizada','productos',producto.id,{});
    await c.commit();committed=true;
    // Solo eliminar rutas generadas por este servicio y sin referencias vigentes.
    if(anterior){try{const [[r]]=await c.query('SELECT COUNT(*) AS n FROM productos WHERE imagen_url=?',[anterior]);if(!Number(r.n))await imagen.borrar(anterior);}catch(e){registrarError('Limpiar imagen anterior de producto',e);}}
    return res.json({mensaje:quitar?'Imagen eliminada correctamente.':'Imagen guardada correctamente.',datos:{id:producto.id,imagen_url:nueva||null}});
  }catch(e){
    if(c&&!committed)try{await c.rollback();}catch{/* Conservar fallo original. */}
    if(nueva&&!committed)try{await imagen.borrar(nueva);}catch(fallo){registrarError('Limpiar imagen no guardada',fallo);}
    if([400,413,415].includes(e.status))return res.status(e.status).json({error:e.message});
    registrarError('Guardar imagen de producto',e,req);return res.status(500).json({error:'Error interno del servidor.'});
  }finally{if(c)try{await c.end();}catch{/* Respuesta emitida. */}}
};}
exports.subir=modificar(false);exports.quitar=modificar(true);
exports.archivo=(req,res)=>{
  const match=('/uploads/productos/'+req.params.archivo).match(imagen.patron);
  if(!match)return res.status(404).end();
  res.set({'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});
  res.type('webp');
  res.sendFile(match[1],{root:imagen.dir,dotfiles:'deny',maxAge:'1y',immutable:true},e=>{
    if(!e||res.headersSent)return;
    if(['ENOENT','ENOTDIR'].includes(e.code)||e.status===404)return res.status(404).end();
    registrarError('Leer imagen de producto',e);res.status(500).end();
  });
};
