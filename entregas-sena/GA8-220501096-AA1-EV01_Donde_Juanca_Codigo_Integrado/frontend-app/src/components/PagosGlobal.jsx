import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog,useCatalogMutation} from '../hooks/useRemoteCatalog';
import {listarPagosGlobal,verificarPago,metodosPago,estadoPago} from '../services/pagosService';
import {formatCurrency} from '../utils/formatCurrency';
import {formatDateTime} from '../utils/dateTime';
import OperacionRemoteState from './OperacionRemoteState';
import {listarMesas} from '../services/mesasService';
import ModalOperacion from './ModalOperacion';
export default function PagosGlobal(){
 const {user}=useAuth();
 const [filtros,setFiltros]=useState({estado:'',metodo_de_pago:'',mesas_id:'',desde:'',hasta:''});
 const [pagina,setPagina]=useState(1),[selected,setSelected]=useState(null),[decision,setDecision]=useState(null);
 const resource=useRemoteCatalog(useCallback(options=>can(user,'pagos.ver')?listarPagosGlobal({...filtros,pagina,limite:20},options):Promise.resolve(null),[user,filtros,pagina]));
 const mutation=useCatalogMutation();
 const mesas=useRemoteCatalog(useCallback(options=>can(user,'pagos.ver')?listarMesas(options):Promise.resolve([]),[user]));
 if(!can(user,'pagos.ver'))return <p>No tienes permiso para consultar los pagos.</p>;
 const data=resource.data,rows=data?.datos||[],pago=rows.find(p=>p.id===selected);
 const cambiar=(field,value)=>{setFiltros({...filtros,[field]:value});setPagina(1);setSelected(null);setDecision(null);};
 async function confirmar(){await mutation.run(()=>verificarPago(pago.id,decision),async()=>{setDecision(null);await resource.refresh();},decision==='verificado'?'Pago verificado.':'Pago rechazado.');}
 return <section className="pagos-global">
  <div className="pagos-filtros">
   <label>Estado<select value={filtros.estado} onChange={e=>cambiar('estado',e.target.value)}><option value="">Todos</option>{['pendiente','verificado','rechazado'].map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></label>
   <label>Método<select value={filtros.metodo_de_pago} onChange={e=>cambiar('metodo_de_pago',e.target.value)}><option value="">Todos</option>{Object.entries(metodosPago).map(([v,t])=><option value={v} key={v}>{t}</option>)}</select></label>
   <label>Mesa<select disabled={mesas.loading||Boolean(mesas.error)} value={filtros.mesas_id} onChange={e=>cambiar('mesas_id',e.target.value)}><option value="">Todas</option>{(mesas.data||[]).map(m=><option key={m.id} value={m.id}>Mesa {m.numero}</option>)}</select></label>
   {['desde','hasta'].map(field=><label key={field}>{field==='desde'?'Desde':'Hasta'}<input type="date" value={filtros[field]} onChange={e=>cambiar(field,e.target.value)}/></label>)}
  </div>
  {mesas.error&&<div role="alert">{mesas.error}<button onClick={mesas.refresh}>Reintentar mesas</button></div>}
  <OperacionRemoteState resource={resource}>
   {data&&<><section className="caja-kpis">{[['Pagos verificados',data.resumen.verificados],['Pagos pendientes',data.resumen.pendientes],['Pagos rechazados',data.resumen.rechazados],['Total verificado',formatCurrency(data.resumen.total_verificado)]].map(([label,value])=><article className="caja-kpi" key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
   {!rows.length?<p>No hay pagos para mostrar.</p>:<div className="caja-table-wrapper"><table className="caja-table"><thead><tr>{['Fecha','Mesa','Cliente','Método','Valor','Estado','Registrado por',''].map((t,i)=><th key={i}>{t}</th>)}</tr></thead><tbody>{rows.map(p=><tr key={p.id}><td>{formatDateTime(p.creado_en)}</td><td>{p.mesa_numero==null?'—':`Mesa ${p.mesa_numero}`}</td><td>{p.cliente_nombre||'—'}</td><td>{metodosPago[p.metodo_de_pago]||'—'}</td><td>{formatCurrency(p.total_seleccionado)}</td><td>{estadoPago(p)}</td><td>{p.registrado_por||'—'}</td><td><button className="drawer-secondary-button" onClick={()=>{setSelected(p.id);setDecision(null);mutation.reset();}}>Ver detalle</button></td></tr>)}</tbody></table></div>}
   <div className="pagos-paginacion"><button disabled={pagina<=1||resource.loading||mutation.busy} onClick={()=>{setPagina(pagina-1);setSelected(null);}}>Anterior</button><span>Página {pagina} de {Math.max(1,data.paginacion.totalPaginas)} · {data.paginacion.total} pagos</span><button disabled={pagina>=data.paginacion.totalPaginas||resource.loading||mutation.busy} onClick={()=>{setPagina(pagina+1);setSelected(null);}}>Siguiente</button></div>
   {pago&&<ModalOperacion title="Detalle del pago" busy={mutation.busy} onClose={()=>{setSelected(null);setDecision(null);}}><dl className="pagos-detalle">{[['Estado',estadoPago(pago)],['Valor',formatCurrency(pago.total_seleccionado)],['Método',metodosPago[pago.metodo_de_pago]],['Mesa',pago.mesa_numero],['Pedido',pago.pedidos_id],['Cliente',pago.cliente_nombre],['Registrado por',pago.registrado_por],['Fecha',formatDateTime(pago.creado_en)],['Verificado/rechazado por',pago.procesado_por],['Fecha de verificación',formatDateTime(pago.procesado_en||pago.verificado_en)],['División asociada',pago.sesion_division_id?'Sí':'No']].map(([t,v])=><div key={t}><dt>{t}</dt><dd className={t==='Pedido'?'pago-reference':undefined}>{v??'—'}</dd></div>)}</dl>
    {can(user,'pagos.verificar')&&estadoPago(pago)==='Pendiente'&&<div className="operacion-actions"><button disabled={mutation.busy} onClick={()=>setDecision('verificado')}>Verificar</button><button disabled={mutation.busy} onClick={()=>setDecision('rechazado')}>Rechazar</button></div>}
    {decision&&<div role="alert"><p>¿{decision==='verificado'?'Verificar':'Rechazar'} este pago?</p><button disabled={mutation.busy} onClick={confirmar}>Confirmar</button><button disabled={mutation.busy} onClick={()=>setDecision(null)}>Volver</button></div>}
   {mutation.error&&<p role="alert">{mutation.error}</p>}{mutation.success&&<p role="status">{mutation.success}</p>}</ModalOperacion>}</>}
  </OperacionRemoteState>
  {!pago&&mutation.error&&<p role="alert">{mutation.error}</p>}{!pago&&mutation.success&&<p role="status">{mutation.success}</p>}
 </section>;
}
