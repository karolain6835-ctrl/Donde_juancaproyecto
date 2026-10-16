import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import {listarActivosJuego,listarSesionesJuego,estadosJuego,tiposJuego} from '../services/juegosService';
import {listarMesas,cuentaMesa} from '../services/mesasService';
import {detallePedido} from '../services/pedidosService';
import {formatCurrency} from '../utils/formatCurrency';
import SesionesJuegosSection from '../components/SesionesJuegosSection';
import HistorialJuegosSection from '../components/HistorialJuegosSection';
import MantenimientoJuegosSection from '../components/MantenimientoJuegosSection';
import JuegoInicioForm from '../components/JuegoInicioForm';
import OperacionRemoteState from '../components/OperacionRemoteState';
import './JuegosPage.css';
import '../components/OperacionForms.css';
import '../components/CatalogoForm.css';
export default function JuegosPage(){
 const {user}=useAuth();const permitido=can(user,'juegos.ver');
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
  setSyncError('');setFeedback(result.total_cobrado!==undefined?'Juego finalizado. Costo final: '+formatCurrency(result.total_cobrado):'Juego iniciado correctamente.');
  setScope(result.datos);await sincronizar(result.datos);
 }
 if(!permitido)return <p>No tienes permiso para consultar juegos.</p>;
 const rows=(activos.data||[]).filter(a=>!estado||a.estado===estado),activo=activos.data?.find(a=>a.id===selected);
 const bloqueado=activos.loading||Boolean(activos.error)||sesiones.loading||Boolean(sesiones.error);
 return <div className="juegos-page"><header className="juegos-header"><p className="page-eyebrow">JUEGOS</p><h1 className="page-title">Juegos</h1><p className="page-description">Consulta los juegos y sus sesiones.</p></header><nav className="juegos-real-nav">{[['activos','Juegos disponibles'],['sesiones','Sesiones activas'],['historial','Historial'],['mantenimiento','Mantenimiento']].map(([id,label])=><button className={tab===id?'active':''} key={id} onClick={()=>setTab(id)}>{label}</button>)}<button className="drawer-secondary-button" disabled={activos.loading||sesiones.loading} onClick={refresh}>Actualizar</button></nav>
 {feedback&&<p className="pedido-feedback" role="status">{feedback}</p>}{syncError&&<div role="alert"><p>La operación fue confirmada. No fue posible actualizar la cuenta: {syncError}</p><button onClick={()=>sincronizar(scope)}>Reintentar</button></div>}
 {tab==='activos'&&<section><h2>Juegos disponibles</h2><label>Estado<select value={estado} onChange={e=>setEstado(e.target.value)}><option value="">Todos</option>{Object.entries(estadosJuego).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label><OperacionRemoteState resource={{...activos,data:rows}} empty="No hay juegos disponibles."><div className="juegos-real-grid">{rows.map(a=>{const activas=[...new Map([...(a.sesiones_activas||[]),...(sesiones.data||[]).filter(s=>s.activos_juego_id===a.id&&s.estado==='activa')].map(s=>[s.id,s])).values()];return <article className="juegos-real-card" key={a.id}><header><h3>{a.nombre}</h3><span className="juegos-real-badge">{estadosJuego[a.estado]}</span></header><p>{tiposJuego[a.tipo]}</p><p>Tarifa por hora: <strong>{formatCurrency(a.precio_hora)}</strong></p>{activas.map(s=><p key={s.id}>Sesión activa · Mesa {s.mesa_numero??'—'}</p>)}{can(user,'juegos.iniciar')&&a.estado==='disponible'&&!activas.length&&<button className="drawer-primary-button" disabled={bloqueado} onClick={()=>setSelected(a.id)}>Iniciar juego</button>}</article>;})}</div></OperacionRemoteState><OperacionRemoteState resource={{...sesiones,data:null}}/>
 {activo&&can(user,'juegos.iniciar')&&<><OperacionRemoteState resource={mesas} empty="No hay mesas disponibles para seleccionar."/><JuegoInicioForm key={activo.id} activo={activo} mesas={mesas} bloqueado={bloqueado} onCancel={()=>setSelected(null)} onChanged={changed}/></>}
 </section>}
 {tab==='sesiones'&&<SesionesJuegosSection resource={sesiones} bloqueado={bloqueado} onChanged={changed}/>}
 {tab==='historial'&&<HistorialJuegosSection resource={sesiones}/>}
 {tab==='mantenimiento'&&<MantenimientoJuegosSection/>}
 </div>;
}
