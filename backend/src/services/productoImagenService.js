const fs = require('node:fs/promises');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const sharp = require('sharp');
const dir = path.resolve(process.env.PRODUCT_IMAGES_DIR || path.join(__dirname, '../../uploads/productos'));
const patron = /^\/uploads\/productos\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp)$/;
const fallo = (status, message) => Object.assign(new Error(message), {status});

async function preparar(file) {
  if (!file) throw fallo(400, 'Selecciona una imagen.');
  const permitidos = {'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
  if (permitidos[path.extname(file.originalname).toLowerCase()] !== file.mimetype || file.size > 5*1024*1024) throw fallo(415, 'Elige una imagen JPG, PNG o WebP de máximo 5 MB.');
  const b=file.buffer;
  const firma=Buffer.isBuffer(b)&&(
    file.mimetype==='image/jpeg'&&b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255||
    file.mimetype==='image/png'&&b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||
    file.mimetype==='image/webp'&&b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP');
  if(!firma)throw fallo(415,'La imagen no es válida. Utiliza JPG, PNG o WebP.');
  try {
    const options = {limitInputPixels:20000000, animated:false, failOn:'warning'};
    const metadata = await sharp(file.buffer, options).metadata();
    if (metadata.format!==({'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'}[file.mimetype]) || (metadata.pages || 1) !== 1) throw Error('Formato no permitido');
    // Decodificar y volver a codificar elimina metadatos y contenido añadido al archivo original.
    return await sharp(file.buffer, options).rotate().resize(1200,1200,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
  } catch { throw fallo(415, 'La imagen no es válida. Utiliza JPG, PNG o WebP sin animación.'); }
}
async function guardar(buffer) {
  const nombre=randomUUID()+'.webp';
  await fs.mkdir(dir,{recursive:true});
  try{await fs.writeFile(path.join(dir,nombre),buffer,{flag:'wx',mode:0o600});}
  catch(e){if(e.code!=='EEXIST')try{await fs.unlink(path.join(dir,nombre));}catch{/* Conservar fallo original. */}throw e;}
  return '/uploads/productos/'+nombre;
}
async function borrar(url) {
  const match=typeof url==='string'&&url.match(patron);
  if (!match) return;
  try { await fs.unlink(path.join(dir,match[1])); } catch(e) { if(e.code!=='ENOENT')throw e; }
}
module.exports={dir,patron,preparar,guardar,borrar};
