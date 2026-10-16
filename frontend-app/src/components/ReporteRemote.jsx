export default function ReporteRemote({resource,children}){
 if(!resource.permitido)return <p>No tienes permiso para consultar este reporte.</p>;
 if(resource.loading)return <p role="status">Cargando reporte...</p>;
 if(resource.error)return <div role="alert"><p>{resource.error}</p><button className="text-button" onClick={resource.refresh}>Reintentar</button></div>;
 return resource.data?children:null;
}
export function ReporteControles({resource,periodo,desde,hasta,setDesde,setHasta,pagina,setPagina,nota}){
 return <><div className="catalogo-actions">{periodo==='personalizado'&&<><label>Desde<input type="date" value={desde} onChange={e=>{setDesde(e.target.value);setPagina(1);}}/></label><label>Hasta<input type="date" value={hasta} onChange={e=>{setHasta(e.target.value);setPagina(1);}}/></label></>}<button className="text-button" disabled={resource.loading} onClick={resource.refresh}>Actualizar</button></div><p>{nota}</p>{resource.data?.paginas!==undefined&&<div className="catalogo-actions"><button disabled={resource.loading||pagina<=1} onClick={()=>setPagina(pagina-1)}>Anterior</button><span>Página {pagina} de {Math.max(1,resource.data.paginas)} · {resource.data.total} resultados</span><button disabled={resource.loading||pagina>=resource.data.paginas} onClick={()=>setPagina(pagina+1)}>Siguiente</button></div>}</>;
}
