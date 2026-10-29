import {useCallback,useMemo,useState} from 'react';
import {Search,Refrigerator,CircleCheck,Wrench,Power,MapPin,ArrowRight,X,Snowflake} from 'lucide-react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog,useCatalogMutation} from '../hooks/useRemoteCatalog';
import {listarRefrigeradores,guardarRefrigerador,estadosRefrigerador} from '../services/refrigeradoresService';
import './RefrigeradoresSection.css';
import RefrigeradorDemoPanel from './RefrigeradorDemoPanel';
const EMPTY_REFRIGERADORES=Object.freeze([]);
// Catálogo real; las existencias por equipo no tienen un flujo operativo sincronizado.
export default function RefrigeradoresSection({onChanged}){
 const {user}=useAuth();const allowed=can(user,'refrigeradores.ver');
 const resource=useRemoteCatalog(useCallback(options=>allowed?listarRefrigeradores(options):Promise.resolve([]),[allowed]));
 const mutation=useCatalogMutation();
 const [busqueda,setBusqueda]=useState(''),[filtroEstado,setFiltroEstado]=useState('todos');
 const [demo,setDemo]=useState(false);
 const [selectedId,setSelectedId]=useState(null),[form,setForm]=useState(null),[editingId,setEditingId]=useState(null);
 const refrigeradores=resource.data||EMPTY_REFRIGERADORES;
 const selected=refrigeradores.find(r=>r.id===selectedId);
 const rows=useMemo(()=>refrigeradores.filter(r=>(filtroEstado==='todos'||r.estado===filtroEstado)&&[r.nombre,r.ubicacion].some(v=>(v||'').toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')))),[refrigeradores,filtroEstado,busqueda]);
 function abrir(r){mutation.reset();setSelectedId(null);setEditingId(r?.id||null);setForm(r?{nombre:r.nombre,ubicacion:r.ubicacion||'',estado:r.estado}:{nombre:'',ubicacion:'',estado:'activa'});}
 async function save(event){
  event.preventDefault();if(!can(user,editingId?'refrigeradores.editar':'refrigeradores.crear'))return;
  await mutation.run(()=>guardarRefrigerador(form,editingId),async()=>{await resource.refresh();await onChanged?.();setForm(null);},'Refrigerador guardado correctamente.');
 }
 async function estado(r,value){
  if(!can(user,'refrigeradores.editar')||r.estado===value)return;
  await mutation.run(()=>guardarRefrigerador({...r,ubicacion:r.ubicacion||'',estado:value},r.id),async()=>{await resource.refresh();await onChanged?.();},'Estado actualizado correctamente.');
 }
 const close=()=>{if(!mutation.busy){setForm(null);setSelectedId(null);}};
 if(!allowed)return <p>No tienes permiso para consultar refrigeradores.</p>;
 if(demo)return <div className="refrigeradores-section"><RefrigeradorDemoPanel onExit={()=>setDemo(false)}/></div>;
 return <div className="refrigeradores-section">
  <div className="refrigeradores-demo-entry"><button type="button" className="drawer-secondary-button" disabled={mutation.busy} onClick={()=>{setForm(null);setSelectedId(null);mutation.reset();setDemo(true);}}>Modo demostración IoT</button></div>
  {mutation.success&&<p role="status">{mutation.success}</p>}{mutation.error&&<p role="alert">{mutation.error}</p>}
  {resource.loading?<p role="status">Cargando refrigeradores...</p>:resource.error?<div role="alert">{resource.error}<button className="drawer-secondary-button" onClick={resource.refresh}>Reintentar</button></div>:<>
  <section className="refrigeradores-kpis">{[['todos','Total',Refrigerator],['activa','Activas',CircleCheck],['mantenimiento','Mantenimiento',Wrench],['apagada','Apagadas',Power]].map(([key,label,Icon])=><button key={key} className={'refrigerador-kpi '+(key===filtroEstado?'selected':'')} onClick={()=>setFiltroEstado(key)}><div className="refrigerador-kpi-icon"><Icon size={20}/></div><span>{label}</span><strong>{key==='todos'?refrigeradores.length:refrigeradores.filter(r=>r.estado===key).length}</strong></button>)}</section>
  <section className="refrigeradores-toolbar"><div className="refrigeradores-filters">{[['todos','Todas'],...Object.entries(estadosRefrigerador)].map(([key,label])=><button key={key} className={'filter-button '+(filtroEstado===key?'active':'')} onClick={()=>setFiltroEstado(key)}>{label}</button>)}</div><div className="refrigeradores-search"><Search className="refrigeradores-search-icon" size={18}/><input aria-label="Buscar refrigerador" placeholder="Buscar refrigerador..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></div><div className="refrigeradores-admin-actions"><button className="drawer-secondary-button" disabled={mutation.busy} onClick={resource.refresh}>Actualizar</button>{can(user,'refrigeradores.crear')&&<button className="primary-button" disabled={mutation.busy} onClick={()=>abrir()}>Crear refrigerador</button>}</div></section>
  {!refrigeradores.length?<p>Aún no hay refrigeradores.</p>:!rows.length?<p>No hay refrigeradores para los filtros seleccionados.</p>:<section className="refrigeradores-grid">{rows.map(r=><article key={r.id} className={'refrigerador-card '+r.estado}><div className="refrigerador-card-header"><div className="refrigerador-icon"><Snowflake size={21}/></div><span className={'refrigerador-status '+r.estado}>{estadosRefrigerador[r.estado]}</span></div><div className="refrigerador-card-body"><h3>{r.nombre}</h3><p className="refrigerador-location"><MapPin size={14}/>{r.ubicacion||'Sin ubicación'}</p></div><button className="refrigerador-detail-button" disabled={mutation.busy} onClick={()=>{mutation.reset();setSelectedId(r.id);}}>Ver detalle<ArrowRight size={15}/></button></article>)}</section>}
  </>}
  {(form||selected)&&<><div className="refrigerador-overlay" onClick={close}/><aside className="refrigerador-drawer" role="dialog" aria-modal="true" aria-label={form?(editingId?'Editar refrigerador':'Crear refrigerador'):'Detalle del refrigerador'}><div className="refrigerador-drawer-header"><h2>{form?(editingId?'Editar refrigerador':'Crear refrigerador'):selected.nombre}</h2><button className="drawer-close" disabled={mutation.busy} aria-label="Cerrar" onClick={close}><X size={20}/></button></div>
  {mutation.error&&<p role="alert">{mutation.error}</p>}
  {form?<form className="refrigerador-admin-form" onSubmit={save}><fieldset disabled={mutation.busy}><label>Nombre<input required maxLength={80} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></label><label>Ubicación<input maxLength={45} value={form.ubicacion} onChange={e=>setForm({...form,ubicacion:e.target.value})}/></label><label>Estado<select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})}>{Object.entries(estadosRefrigerador).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><div className="refrigeradores-admin-actions"><button type="button" className="drawer-secondary-button" onClick={close}>Cancelar</button><button className="drawer-primary-button" disabled={!form.nombre.trim()}>{mutation.busy?'Guardando...':'Guardar cambios'}</button></div></fieldset></form>:<><div className={'refrigerador-drawer-status '+selected.estado}><span>Estado actual</span><strong>{estadosRefrigerador[selected.estado]}</strong></div><div className="refrigerador-detail-grid"><div><span>Ubicación</span><strong>{selected.ubicacion||'Sin ubicación'}</strong></div></div><p className="refrigerador-empty-products">Las existencias por refrigerador aún no están disponibles.</p>{can(user,'refrigeradores.editar')&&<div className="refrigerador-state-actions"><button className="drawer-secondary-button" disabled={mutation.busy||resource.loading||Boolean(resource.error)} onClick={()=>abrir(selected)}>Editar refrigerador</button><p>Cambiar estado</p><div className="refrigeradores-admin-actions">{Object.entries(estadosRefrigerador).map(([key,label])=><button key={key} className={'state-button '+(key===selected.estado?'active':'')} disabled={mutation.busy||resource.loading||Boolean(resource.error)||key===selected.estado} onClick={()=>estado(selected,key)}>{label}</button>)}</div></div>}</>}
  </aside></>}
 </div>;
}
