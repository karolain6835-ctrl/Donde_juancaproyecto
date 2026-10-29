import {Target,CircleDot,Gamepad2,Clock3,History,Wrench,RefreshCw,ArrowRight} from 'lucide-react';
import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import {listarActivosJuego,listarSesionesJuego,tiposJuego,juegoSinPedidoPendiente} from '../services/juegosService';
import {listarMesas,cuentaMesa} from '../services/mesasService';
import {detallePedido} from '../services/pedidosService';
import {formatCurrency} from '../utils/formatCurrency';
import SesionesJuegosSection from '../components/SesionesJuegosSection';
import HistorialJuegosSection from '../components/HistorialJuegosSection';
import MantenimientoJuegosSection from '../components/MantenimientoJuegosSection';
import JuegoInicioForm from '../components/JuegoInicioForm';
import JuegoTarifaForm from '../components/JuegoTarifaForm';
import JuegoPedidoForm from '../components/JuegoPedidoForm';
import JuegoPagoForm from '../components/JuegoPagoForm';
import TejoDemoPanel from '../components/TejoDemoPanel';
import OperacionRemoteState from '../components/OperacionRemoteState';
import './JuegosPage.css';
import '../components/OperacionForms.css';
import '../components/CatalogoForm.css';
const etiquetasEstado={disponible:'Disponible',ocupado:'En uso',mantenimiento:'En mantenimiento'};
const iconosTab={activos:Gamepad2,sesiones:Clock3,historial:History,mantenimiento:Wrench};
export default function JuegosPage(){
 const {user}=useAuth();const permitido=can(user,'juegos.ver');
 const [demo,setDemo]=useState(false);
 const [tarifaId,setTarifaId]=useState(null),[asociarId,setAsociarId]=useState(null),[cobroId,setCobroId]=useState(null);
 const [tab,setTab]=useState('activos'),[estado,setEstado]=useState(''),[selected,setSelected]=useState(null),[feedback,setFeedback]=useState(''),[syncError,setSyncError]=useState(''),[scope,setScope]=useState(null);
 const activos=useRemoteCatalog(useCallback(options=>permitido?listarActivosJuego(options):Promise.resolve([]),[permitido]));
 const sesiones=useRemoteCatalog(useCallback(options=>permitido?listarSesionesJuego(undefined,options):Promise.resolve([]),[permitido]));
 const mesas=useRemoteCatalog(useCallback(options=>permitido?listarMesas(options):Promise.resolve([]),[permitido]));
 async function refresh(){await Promise.all([activos.refresh(),sesiones.refresh(),mesas.refresh()]);}
 async function sincronizar(s){
  setSyncError('');
  const pedido=s.pedidos_id||s.pedido_id;
  await Promise.all([refresh(),cuentaMesa(s.mesas_id).catch(e=>setSyncError(e.message)),...(pedido?[detallePedido(pedido).catch(e=>setSyncError(e.message))]:[])]);
 }
 async function changed(result){
  setSyncError('');setFeedback(result.total_cobrado!==undefined?'Juego finalizado. Costo final: '+formatCurrency(result.total_cobrado):(result.mensaje||'Juego iniciado correctamente.'));
  setScope(result.datos);await sincronizar(result.datos);
 }
 if(!permitido)return <p>No tienes permiso para consultar juegos.</p>;
 if(demo)return <div className="juegos-page"><TejoDemoPanel onExit={()=>setDemo(false)}/></div>;
 const rows=(activos.data||[]).filter(a=>!estado||a.estado===estado),activo=activos.data?.find(a=>a.id===selected);
 const bloqueado=activos.loading||Boolean(activos.error)||sesiones.loading||Boolean(sesiones.error);
 return <div className="juegos-page">
  <header className="juegos-header"><div><p className="page-eyebrow">JUEGOS</p><h1 className="page-title">Gestión de juegos</h1><p className="page-description">Administra las sesiones de tejo y billar.</p></div><button className="juegos-refresh" disabled={activos.loading||sesiones.loading} onClick={refresh}><RefreshCw size={16}/>Actualizar</button></header>
  <button type="button" className="tejo-demo-entry" onClick={()=>{setSelected(null);setTarifaId(null);setAsociarId(null);setCobroId(null);setDemo(true);}}><Target size={19}/>MODO DEMOSTRACIÓN · Marcador inteligente</button>
  <nav className="juegos-tabs" aria-label="Secciones de juegos">{[['activos','Juegos disponibles'],['sesiones','Sesiones activas'],['historial','Historial'],['mantenimiento','Mantenimiento']].map(([id,label])=>{const Icon=iconosTab[id];return <button className={tab===id?'active':''} aria-current={tab===id?'page':undefined} key={id} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>;})}</nav>
  {feedback&&<p className="juegos-feedback" role="status">{feedback}</p>}
  {syncError&&<div className="juegos-error" role="alert"><p>La operación fue confirmada. No fue posible actualizar la cuenta: {syncError}</p><button className="drawer-secondary-button" onClick={()=>sincronizar(scope)}>Reintentar</button></div>}
  {can(user,'pagos.crear')&&(sesiones.data||[]).some(juegoSinPedidoPendiente)&&<section className="juegos-active-section"><h2>Juegos sin pedido</h2><p>Puedes cobrar el juego directamente o asociar un pedido real de esta visita antes de registrar pagos.</p>{(sesiones.data||[]).filter(juegoSinPedidoPendiente).map(s=><div className="juegos-session-note juegos-unassigned-row" key={s.id}><span>{s.activo_nombre||'Juego'} · Mesa {s.mesa_numero??'—'} · {s.estado==='activa'?'En curso':formatCurrency(s.costo_total)}</span>{can(user,'juegos.iniciar')&&Number(s.pagado_directo||0)===0&&Number(s.pendiente_directo||0)===0&&<button className="drawer-secondary-button" disabled={bloqueado} onClick={()=>setAsociarId(s.id)}>Asociar pedido</button>}{s.estado==='cerrada'&&<button className="drawer-primary-button" disabled={bloqueado} onClick={()=>setCobroId(s.id)}>Cobrar juego</button>}</div>)}</section>}
  {tarifaId&&activos.data?.find(a=>a.id===tarifaId)&&<JuegoTarifaForm key={tarifaId} activo={activos.data.find(a=>a.id===tarifaId)} onChanged={async()=>{await refresh();setFeedback('Tarifa actualizada para sesiones futuras.');}} onClose={()=>setTarifaId(null)}/>}
  {asociarId&&sesiones.data?.find(s=>s.id===asociarId)&&<JuegoPedidoForm key={asociarId} sesion={sesiones.data.find(s=>s.id===asociarId)} onChanged={changed} onClose={()=>setAsociarId(null)}/>}
  {cobroId&&sesiones.data?.find(s=>s.id===cobroId)&&<JuegoPagoForm key={cobroId} sesion={sesiones.data.find(s=>s.id===cobroId)} onChanged={refresh} onClose={()=>setCobroId(null)}/>}
  {tab==='activos'&&<section aria-labelledby="juegos-disponibles-titulo">
   <div className="juegos-toolbar"><div><h2 id="juegos-disponibles-titulo">Juegos disponibles</h2><p>Elige un juego para iniciar una sesión.</p></div><label className="juegos-state-filter">Estado<select value={estado} onChange={e=>setEstado(e.target.value)}><option value="">Todos</option>{Object.entries(etiquetasEstado).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label></div>
   <OperacionRemoteState resource={{...activos,data:rows}} empty="No hay juegos disponibles."><div className="juegos-card-grid">{rows.map(a=>{
    const activas=[...new Map([...(a.sesiones_activas||[]),...(sesiones.data||[]).filter(s=>s.activos_juego_id===a.id&&s.estado==='activa')].map(s=>[s.id,s])).values()];
    const Icon=a.tipo==='tejo'?Target:a.tipo==='billar'?CircleDot:Gamepad2;
    return <article className="juegos-asset-card" key={a.id}><div className="juegos-card-heading"><div className={'juegos-icon '+a.tipo}><Icon size={27}/></div><span className={'juegos-badge '+a.estado}>{etiquetasEstado[a.estado]}</span></div><div className="juegos-asset-name"><h3>{a.nombre}</h3><p>{tiposJuego[a.tipo]}</p></div><div className="juegos-tarifa"><span>Tarifa por hora</span><strong>{formatCurrency(a.precio_hora)}</strong></div>{can(user,'juegos.editarTarifa')&&<button className="drawer-secondary-button" disabled={bloqueado} onClick={()=>setTarifaId(a.id)}>Editar tarifa</button>}{activas.map(s=><p className="juegos-session-note" key={s.id}><Clock3 size={14}/>Sesión activa · Mesa {s.mesa_numero??'—'}</p>)}{can(user,'juegos.iniciar')&&a.estado==='disponible'&&!activas.length&&<button className="drawer-primary-button juegos-start" disabled={bloqueado} onClick={()=>setSelected(a.id)}>Iniciar juego<ArrowRight size={16}/></button>}</article>;
   })}</div></OperacionRemoteState><OperacionRemoteState resource={{...sesiones,data:null}}/>
   {activo&&can(user,'juegos.iniciar')&&<><JuegoInicioForm key={activo.id} activo={activo} mesas={mesas} bloqueado={bloqueado} onCancel={()=>setSelected(null)} onChanged={changed}/></>}
  </section>}
  {tab==='sesiones'&&<SesionesJuegosSection resource={sesiones} bloqueado={bloqueado} onChanged={changed}/>}
  {tab==='historial'&&<HistorialJuegosSection resource={sesiones}/>}
  {tab==='mantenimiento'&&<MantenimientoJuegosSection resource={activos} onChanged={refresh}/>}
 </div>;
}
