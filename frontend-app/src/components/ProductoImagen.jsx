import {useState} from 'react';
import {Package} from 'lucide-react';
import {imagenProductoUrl} from '../services/productoImagenService';
import './ProductoImagen.css';

export default function ProductoImagen({url,nombre='producto',grande=false}) {
  const src=imagenProductoUrl(url),[fallida,setFallida]=useState(null);
  return <span className={`producto-imagen ${grande?'producto-imagen-grande':''}`}>
    {src&&fallida!==src?<img src={src} alt={`Imagen de ${nombre}`} loading="lazy" onError={()=>setFallida(src)}/>:<span className="producto-imagen-placeholder" role="img" aria-label={`Sin imagen de ${nombre}`}><Package size={grande?38:23} aria-hidden="true"/></span>}
  </span>;
}
