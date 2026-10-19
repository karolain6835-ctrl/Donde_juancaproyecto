import {useCallback,useState} from 'react';
import {ClipboardList,ArrowRight,X,LockKeyhole,RefreshCw} from 'lucide-react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {formatDateTime} from '../utils/dateTime';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import {listarAuditoria,nombreAuditoria} from '../services/auditoriaService';
import {listarUsuariosAdmin} from '../services/usuariosAdminService';
import OperacionRemoteState from './OperacionRemoteState';
import './AuditoriaSection.css';
const inicial={fecha_desde:'',fecha_hasta:'',usuario:'',accion:'',modulo:''};
function Cambios({datos}){
 if(datos===null)return <span>Sin valor</span>;
 if(typeof datos!=='object')return <span>{String(datos)}</span>;
 if(Array.isArray(datos))return <ol>{datos.map((v,i)=><li key={i}><Cambios datos={v}/></li>)}</ol>;
 const campos=Object.entries(datos);return campos.length?<dl className="auditoria-cambios">{campos.map(([k,v])=><div key={k}><dt>{nombreAuditoria(k)}</dt><dd><Cambios datos={v}/></dd></div>)}</dl>:<p>Sin cambios adicionales disponibles.</p>;
}
export default function AuditoriaSection(){
 const {user}=useAuth(),permitido=can(user,'auditoria.ver');
 const [form,setForm]=useState(inicial),[query,setQuery]=useState({pagina:1,limite:20}),[selected,setSelected]=useState(null);
 const resource=useRemoteCatalog(useCallback(options=>permitido?listarAuditoria(query,options):Promise.resolve(null),[permitido,query]));
 const usuarios=useRemoteCatalog(useCallback(options=>permitido?listarUsuariosAdmin(options):Promise.resolve([]),[permitido]));
 function filtrar(e){e.preventDefault();setSelected(null);setQuery({...form,pagina:1,limite:20});}
 function limpiar(){setForm(inicial);setQuery({pagina:1,limite:20});setSelected(null);}
 function pagina(n){setSelected(null);setQuery({...query,pagina:n});}
 if(!permitido)return <p>No tienes permiso para consultar auditoría.</p>;
 const rows=resource.data?.datos||[],p=resource.data?.paginacion;
 return <div className="auditoria-section"><section className="auditoria-toolbar"><div><h2>Historial de auditoría</h2><p>Eventos guardados por el sistema.</p></div><button className="auditoria-refresh" disabled={resource.loading} onClick={resource.refresh}><RefreshCw size={15}/>Actualizar</button></section>
 <form className="auditoria-filters auditoria-real-filters" onSubmit={filtrar}>
  <label>Desde<input type="date" value={form.fecha_desde} onChange={e=>setForm({...form,fecha_desde:e.target.value})}/></label><label>Hasta<input type="date" value={form.fecha_hasta} onChange={e=>setForm({...form,fecha_hasta:e.target.value})}/></label>
  <label>Usuario<select value={form.usuario} disabled={usuarios.loading||Boolean(usuarios.error)} onChange={e=>setForm({...form,usuario:e.target.value})}><option value="">Todos los usuarios</option>{(usuarios.data||[]).map(u=><option key={u.id} value={u.id}>{u.nombre||'Sin nombre'} · {u.rol}</option>)}</select></label>
  <label>Acción<input type="text" maxLength={100} value={form.accion} list="auditoria-acciones" onChange={e=>setForm({...form,accion:e.target.value})}/><datalist id="auditoria-acciones">{[...new Set(rows.map(r=>r.tipo_evento))].map(v=><option key={v} value={v}>{nombreAuditoria(v)}</option>)}</datalist></label>
  <label>Módulo<input type="text" maxLength={45} value={form.modulo} list="auditoria-modulos" onChange={e=>setForm({...form,modulo:e.target.value})}/><datalist id="auditoria-modulos">{[...new Set(rows.map(r=>r.categoria))].map(v=><option key={v} value={v}>{nombreAuditoria(v)}</option>)}</datalist></label>
  <div className="auditoria-filter-actions"><button className="auditoria-filter-submit" type="submit" disabled={resource.loading}>Filtrar</button><button type="button" className="auditoria-refresh" onClick={limpiar}>Limpiar filtros</button></div>
 </form><p className="auditoria-filter-note">Fechas de eventos en UTC, incluyendo el día final. Acción y módulo buscan coincidencias exactas; las sugerencias corresponden a la página actual.</p>
 {usuarios.error&&<div role="alert"><p>{usuarios.error}</p><button className="text-button" onClick={usuarios.refresh}>Reintentar usuarios</button></div>}
 <OperacionRemoteState resource={resource} empty="No hay eventos de auditoría para los filtros seleccionados."><section className="auditoria-panel"><div className="auditoria-panel-header"><div className="auditoria-panel-title"><div className="auditoria-panel-icon"><ClipboardList size={20}/></div><div><h2>Eventos de auditoría</h2><p>{p?.total} eventos para los filtros seleccionados</p></div></div><span className="auditoria-readonly-badge"><LockKeyhole size={13}/>Solo lectura</span></div><div className="auditoria-table-wrapper"><table className="auditoria-table"><thead><tr><th>Fecha / hora</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Detalle</th><th></th></tr></thead><tbody>{rows.map(e=><tr key={e.id}><td>{formatDateTime(e.creado_en)}</td><td>{e.usuario_nombre||'Sin nombre disponible'}</td><td>{nombreAuditoria(e.tipo_evento)}</td><td>{nombreAuditoria(e.categoria)}</td><td>{nombreAuditoria(e.entidad)} · {nombreAuditoria(e.resultado)}</td><td><button className="auditoria-detail-button" onClick={()=>setSelected(e)}>Ver detalle<ArrowRight size={15}/></button></td></tr>)}</tbody></table></div></section></OperacionRemoteState>
 {p&&<nav className="auditoria-pagination" aria-label="Paginación de auditoría"><button disabled={resource.loading||p.pagina<=1} onClick={()=>pagina(p.pagina-1)}>Anterior</button><span aria-live="polite">Página {p.pagina} de {Math.max(1,p.total_paginas)}</span><button disabled={resource.loading||p.pagina>=p.total_paginas} onClick={()=>pagina(p.pagina+1)}>Siguiente</button></nav>}
 {selected&&<><div className="auditoria-overlay" onClick={()=>setSelected(null)}/><aside className="auditoria-drawer" aria-label="Detalle del evento"><div className="auditoria-drawer-header"><div><p className="page-eyebrow">AUDITORÍA</p><h2>{nombreAuditoria(selected.tipo_evento)}</h2></div><button className="drawer-close" onClick={()=>setSelected(null)} aria-label="Cerrar detalle"><X size={20}/></button></div><div className="auditoria-detail-grid">{[['Usuario',selected.usuario_nombre||'Sin nombre disponible'],['Fecha',formatDateTime(selected.creado_en)],['Módulo',nombreAuditoria(selected.categoria)],['Entidad',nombreAuditoria(selected.entidad)],['Resultado',nombreAuditoria(selected.resultado)]].map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div><div className="auditoria-description"><span>Referencia de la entidad</span><p className="auditoria-reference">{selected.entidad_id}</p></div><section className="auditoria-description"><h3>Cambios del evento</h3><Cambios datos={selected.detalle}/>{selected.detalle_omitido&&<p>Parte del contenido se omitió para proteger información sensible o no admitida.</p>}</section></aside></>}
 </div>;
}
