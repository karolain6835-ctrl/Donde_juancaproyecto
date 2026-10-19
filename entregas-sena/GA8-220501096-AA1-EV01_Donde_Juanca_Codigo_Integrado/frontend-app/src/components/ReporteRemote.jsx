import {RefreshCw} from 'lucide-react';
import './ReporteRemote.css';

export default function ReporteRemote({resource,children}){
 if(!resource.permitido)return <p>No tienes permiso para consultar este reporte.</p>;
 if(resource.loading)return <p role="status">Cargando reporte...</p>;
 if(resource.error)return <div role="alert"><p>{resource.error}</p><button className="text-button" onClick={resource.refresh}>Reintentar</button></div>;
 return resource.data?children:null;
}
export function ReporteControles({resource,periodo,desde,hasta,setDesde,setHasta,setPagina,nota,refresh=true}){
 if(!nota&&!refresh&&periodo!=='personalizado')return null;
 return <div className="reporte-controles">{nota&&<p>{nota}</p>}<div className="reporte-controles-actions">{periodo==='personalizado'&&<><label>Desde<input type="date" value={desde} onChange={e=>{setDesde(e.target.value);setPagina(1);}}/></label><label>Hasta<input type="date" value={hasta} onChange={e=>{setHasta(e.target.value);setPagina(1);}}/></label></>}{refresh&&<button type="button" className="reporte-refresh" title="Actualizar datos" aria-label="Actualizar datos" disabled={resource.loading} onClick={resource.refresh}><RefreshCw size={17}/></button>}</div></div>;
}
export function ReportePaginacion({resource,pagina,setPagina}){
 if(resource.data?.paginas===undefined)return null;
 return <nav className="reporte-paginacion" aria-label="Paginación del reporte"><button type="button" disabled={resource.loading||pagina<=1} onClick={()=>setPagina(pagina-1)}>Anterior</button><span>Página {pagina} de {Math.max(1,resource.data.paginas)}<small>{resource.data.total} resultados</small></span><button type="button" disabled={resource.loading||pagina>=resource.data.paginas} onClick={()=>setPagina(pagina+1)}>Siguiente</button></nav>;
}
