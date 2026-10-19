import {useEffect,useState} from 'react';
import ProductoImagen from './ProductoImagen';
import {validarImagenProducto} from '../services/productoImagenService';
import './ProductoImagen.css';

export default function ProductoImagenEditor({actual,value,onChange}) {
  const [preview,setPreview]=useState(null);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  return <section className="producto-imagen-editor" aria-label="Imagen del producto">
    {preview&&value.archivo?<img className="producto-imagen-preview" src={preview} alt="Vista previa del producto" onError={()=>{setPreview(null);onChange({archivo:null,eliminar:false,error:'La imagen no se puede abrir. Selecciona otra.'});}}/>:<ProductoImagen grande url={value.eliminar?null:actual}/>}
    <div><label>Imagen del producto (opcional)<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e=>{
      const file=e.target.files?.[0];if(!file)return;
      const error=validarImagenProducto(file);setPreview(error?null:URL.createObjectURL(file));onChange({archivo:error?null:file,eliminar:false,error});e.target.value='';
    }}/></label><small>JPG, PNG o WebP. Máximo 5 MB.</small>
    <div className="producto-imagen-acciones">{(actual||value.archivo)&&!value.eliminar&&<button type="button" className="text-button" onClick={()=>{setPreview(null);onChange({archivo:null,eliminar:true,error:''});}}>Quitar imagen</button>}
    {(value.eliminar||value.archivo||value.error)&&<button type="button" className="text-button" onClick={()=>{setPreview(null);onChange({archivo:null,eliminar:false,error:''});}}>{actual?'Conservar imagen actual':'Continuar sin imagen'}</button>}</div>
    {value.error&&<p role="alert">{value.error}</p>}
    {value.eliminar&&<small>La imagen se quitará al guardar el producto.</small>}</div>
  </section>;
}
