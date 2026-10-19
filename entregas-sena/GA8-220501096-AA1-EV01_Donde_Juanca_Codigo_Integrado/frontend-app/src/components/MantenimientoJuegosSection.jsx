import {useState,useRef} from 'react';
import {Wrench} from 'lucide-react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {cambiarEstadoJuego,estadosJuego,tiposJuego} from '../services/juegosService';
import OperacionRemoteState from './OperacionRemoteState';

export default function MantenimientoJuegosSection({resource,onChanged}){
 const {user}=useAuth();
 const lock=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 async function cambiar(activo){
  if(lock.current||!can(user,'juegos.mantenimiento'))return;
  lock.current=true;setBusy(true);setError('');setSuccess('');
  try{
   await cambiarEstadoJuego(activo.id,activo.estado==='mantenimiento'?'disponible':'mantenimiento');
   await onChanged();setSuccess('Estado del juego actualizado correctamente.');
  }catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
 }
 return <section aria-labelledby="mantenimiento-titulo">
  <div className="juegos-toolbar"><div><h2 id="mantenimiento-titulo">Mantenimiento de juegos</h2><p>Consulta el estado de los juegos y su disponibilidad.</p></div><Wrench size={24}/></div>
  {error&&<p className="juegos-error" role="alert">{error}</p>}{success&&<p className="juegos-feedback" role="status">{success}</p>}
  <OperacionRemoteState resource={resource} empty="No hay juegos disponibles."><div className="juegos-card-grid">{(resource.data||[]).map(a=>{
   const activa=a.estado==='ocupado'||a.sesiones_activas?.length>0;
   return <article className="juegos-asset-card" key={a.id}><div className="juegos-card-heading"><Wrench size={24}/><span className={'juegos-badge '+a.estado}>{estadosJuego[a.estado]}</span></div><div className="juegos-asset-name"><h3>{a.nombre}</h3><p>{tiposJuego[a.tipo]}</p></div>
    {activa&&<p className="juegos-session-note">Finaliza primero la sesión activa para cambiar el estado.</p>}
    {(a.sesiones_activas||[]).map(s=><p key={s.id}>Sesión activa · Mesa {s.mesa_numero??'—'}</p>)}
    {can(user,'juegos.mantenimiento')&&<button className="drawer-secondary-button" disabled={busy||resource.loading||Boolean(resource.error)||activa} onClick={()=>cambiar(a)}>{busy?'Guardando...':a.estado==='mantenimiento'?'Volver a disponible':'Poner en mantenimiento'}</button>}
   </article>;
  })}</div></OperacionRemoteState>
 </section>;
}
