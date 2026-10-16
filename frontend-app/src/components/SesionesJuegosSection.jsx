import {useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useCatalogMutation} from '../hooks/useRemoteCatalog';
import {finalizarJuego} from '../services/juegosService';
import {formatDateTime} from '../utils/dateTime';
import {formatCurrency} from '../utils/formatCurrency';
import OperacionRemoteState from './OperacionRemoteState';
export default function SesionesJuegosSection({resource,onChanged,bloqueado=false}){
 const {user}=useAuth();const [selected,setSelected]=useState(null);const mutation=useCatalogMutation();
 const rows=(resource.data||[]).filter(s=>s.estado==='activa');
 async function confirmar(){if(!selected||!can(user,'juegos.finalizar')||bloqueado)return;await mutation.run(async()=>{const result=await finalizarJuego(selected.id);await onChanged(result);},async()=>setSelected(null),'Juego finalizado.');}
 return <section><h2>Sesiones activas</h2><OperacionRemoteState resource={{...resource,data:rows}} empty="No hay sesiones activas."><div className="juegos-real-grid">{rows.map(s=><article className="juegos-real-card" key={s.id}><header><h3>{s.activo_nombre||'Juego'}</h3><span className="juegos-real-badge">Activa</span></header><p>Mesa {s.mesa_numero??'—'}</p><p className="juegos-real-reference">Pedido: {(s.pedidos_id||s.pedido_id)?.slice(0,8)||'Sin referencia disponible'}</p><p>Inicio: {formatDateTime(s.fecha_inicio)}</p><p>Tarifa por hora: {formatCurrency(s.tarifa_hora_aplicada)}</p><p>El costo final se calcula al finalizar el juego.</p>
 {can(user,'juegos.finalizar')&&<button className="drawer-secondary-button" disabled={mutation.busy||bloqueado} onClick={()=>{mutation.reset();setSelected(s);}}>Finalizar juego</button>}</article>)}</div></OperacionRemoteState>
 {selected&&can(user,'juegos.finalizar')&&<div className="juegos-real-panel" role="alert"><p>¿Finalizar {selected.activo_nombre||'este juego'} en Mesa {selected.mesa_numero??'—'}?</p><div className="operacion-actions"><button className="drawer-primary-button" disabled={mutation.busy||bloqueado||resource.loading||Boolean(resource.error)} onClick={confirmar}>{mutation.busy?'Finalizando...':'Confirmar'}</button><button className="drawer-secondary-button" disabled={mutation.busy} onClick={()=>setSelected(null)}>Cancelar</button></div></div>}
 {mutation.error&&<p role="alert">{mutation.error}</p>}
 </section>;
}
