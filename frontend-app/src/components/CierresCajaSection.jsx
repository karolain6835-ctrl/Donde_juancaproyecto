import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import {listarCierres,periodoCierre,fechaLocalCierre} from '../services/cierresCajaService';
import {formatCurrency} from '../utils/formatCurrency';
import {formatDateTime} from '../utils/dateTime';
import {NuevoCierre,DetalleCierre} from './CierreCajaReal';
import OperacionRemoteState from './OperacionRemoteState';
import './CierresCajaSection.css';
const inicial=()=>{const now=new Date(),start=new Date(now);start.setHours(0,0,0,0);return {fecha_inicio:fechaLocalCierre(start),fecha_fin:fechaLocalCierre(now)};};
export default function CierresCajaSection(){
 const {user}=useAuth();
 const [query,setQuery]=useState({pagina:1,limite:20}),[filters,setFilters]=useState({fecha_inicio:'',fecha_fin:'',usuarios_id:''});
 const [form,setForm]=useState(inicial),[periodo,setPeriodo]=useState(null),[selected,setSelected]=useState(null),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const history=useRemoteCatalog(useCallback(options=>can(user,'cierres.ver')?listarCierres(query,options):Promise.resolve(null),[query,user]));
 if(!can(user,'cierres.ver'))return <p>No tienes permiso para consultar cierres.</p>;
 function abrir(e){e.preventDefault();setError('');setSuccess('');try{setPeriodo(periodoCierre(form));setSelected(null);}catch(e){setError(e.message);}}
 function filtrar(e){e.preventDefault();setError('');try{const dates=filters.fecha_inicio||filters.fecha_fin?periodoCierre(filters):{};setQuery({pagina:1,limite:20,...dates,usuarios_id:filters.usuarios_id});}catch(e){setError(e.message);}}
 async function cerrado(c){await history.refresh();setPeriodo(null);setSelected(c.id);setSuccess('Cierre guardado correctamente.');}
 return <section className="cierres-reales"><h2>Historial de cierres</h2>
  {can(user,'cierres.crear')&&!periodo&&<form className="cierre-real-filtros" onSubmit={abrir}><h3>Cerrar caja</h3>{['fecha_inicio','fecha_fin'].map(k=><label key={k}>{k==='fecha_inicio'?'Desde':'Hasta'}<input type="datetime-local" step="1" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} required/></label>)}<button className="drawer-primary-button" type="submit">Cerrar caja</button></form>}
  {periodo&&can(user,'cierres.crear')&&<NuevoCierre periodo={periodo} onCancel={()=>setPeriodo(null)} onClosed={cerrado}/>}
  {error&&<p role="alert">{error}</p>}{success&&<p role="status">{success}</p>}
  <form className="cierre-real-filtros" onSubmit={filtrar}>{['fecha_inicio','fecha_fin'].map(k=><label key={k}>{k==='fecha_inicio'?'Cierres desde':'Cierres hasta'}<input type="datetime-local" step="1" value={filters[k]} onChange={e=>setFilters({...filters,[k]:e.target.value})}/></label>)}<label>Responsable<select value={filters.usuarios_id} onChange={e=>setFilters({...filters,usuarios_id:e.target.value})}><option value="">Todos</option>{(history.data?.responsables||[]).map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}</select></label><button className="drawer-secondary-button" type="submit">Filtrar</button><button className="drawer-secondary-button" type="button" onClick={history.refresh}>Actualizar</button></form>
  <OperacionRemoteState resource={history} empty="Aún no hay cierres de caja.">
   <div className="cierre-real-tabla"><table><thead><tr>{['Fecha','Responsable','Total','Efectivo esperado','Efectivo contado','Diferencia',''].map((t,i)=><th key={i}>{t}</th>)}</tr></thead><tbody>{(history.data?.datos||[]).map(c=><tr key={c.id}><td>{formatDateTime(c.fecha)}</td><td>{c.responsable_nombre||'—'}</td><td>{formatCurrency(c.total_general)}</td><td>{formatCurrency(c.total_efectivo_esperado)}</td><td>{formatCurrency(c.total_efectivo_real)}</td><td>{c.diferencia_efectivo.startsWith('-')?'Faltante':/^0[.]00$/.test(c.diferencia_efectivo)?'Sin diferencia':'Sobrante'} · {formatCurrency(c.diferencia_efectivo)}</td><td><button className="drawer-secondary-button" onClick={()=>setSelected(c.id)}>Ver detalle</button></td></tr>)}</tbody></table></div>
  </OperacionRemoteState>
  {history.data&&<div className="cierre-real-paginacion"><button disabled={history.loading||query.pagina<=1} onClick={()=>setQuery({...query,pagina:query.pagina-1})}>Anterior</button><span>Página {query.pagina} · {history.data.total} cierres</span><button disabled={history.loading||query.pagina*query.limite>=history.data.total} onClick={()=>setQuery({...query,pagina:query.pagina+1})}>Siguiente</button></div>}
  {selected&&<DetalleCierre id={selected} onClose={()=>setSelected(null)}/>}
 </section>;
}
