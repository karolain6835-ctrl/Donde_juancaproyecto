import {Gamepad2,Clock3} from 'lucide-react';
import {useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useCatalogMutation} from '../hooks/useRemoteCatalog';
import {finalizarJuego} from '../services/juegosService';
import {formatDateTime} from '../utils/dateTime';
import {formatCurrency} from '../utils/formatCurrency';
import OperacionRemoteState from './OperacionRemoteState';
import ModalOperacion from './ModalOperacion';
export default function SesionesJuegosSection({resource,onChanged,bloqueado=false}){
 const {user}=useAuth();const [selected,setSelected]=useState(null);const mutation=useCatalogMutation();
 const rows=(resource.data||[]).filter(s=>s.estado==='activa');
 async function confirmar(){if(!selected||!can(user,'juegos.finalizar')||bloqueado)return;await mutation.run(async()=>{const result=await finalizarJuego(selected.id);await onChanged(result);},async()=>setSelected(null),'Juego finalizado.');}
 return <section className="juegos-active-section"><div className="juegos-section-heading"><h2>Sesiones activas</h2><p>Juegos en curso y pedidos asociados.</p></div><OperacionRemoteState resource={{...resource,data:rows}} empty="No hay sesiones activas."><div className="juegos-card-grid">{rows.map(s=><article className="juegos-session-card" key={s.id}><header className="juegos-session-heading"><div className="juegos-icon"><Gamepad2 size={24}/></div><h3>{s.activo_nombre||'Juego'}</h3><span className="juegos-badge activa">Activa</span></header><dl className="juegos-detail-grid"><div><dt>Mesa</dt><dd>Mesa {s.mesa_numero??'—'}</dd></div><div><dt>Pedido</dt><dd className="juegos-reference">{(s.pedidos_id||s.pedido_id)?.slice(0,8)||'Sin referencia disponible'}</dd></div><div className="juegos-detail-wide"><dt>Inicio</dt><dd>{formatDateTime(s.fecha_inicio)}</dd></div><div className="juegos-detail-wide"><dt>Tarifa por hora</dt><dd>{formatCurrency(s.tarifa_hora_aplicada)}</dd></div></dl><p className="juegos-cost-note"><Clock3 size={14}/>El costo final se calcula al finalizar el juego.</p>
 {can(user,'juegos.finalizar')&&<button className="drawer-secondary-button juegos-finish" disabled={mutation.busy||bloqueado} onClick={()=>{mutation.reset();setSelected(s);}}>Finalizar juego</button>}</article>)}</div></OperacionRemoteState>
 {selected&&can(user,'juegos.finalizar')&&<ModalOperacion title="Finalizar juego" busy={mutation.busy} onClose={()=>setSelected(null)}><div className="juegos-confirm-panel" role="alert"><p>¿Finalizar {selected.activo_nombre||'este juego'} en Mesa {selected.mesa_numero??'—'}?</p><div className="operacion-actions juegos-form-actions"><button className="drawer-secondary-button" disabled={mutation.busy} onClick={()=>setSelected(null)}>Cancelar</button><button className="drawer-primary-button" disabled={mutation.busy||bloqueado||resource.loading||Boolean(resource.error)} onClick={confirmar}>{mutation.busy?'Finalizando...':'Confirmar'}</button></div>{mutation.error&&<p role="alert">{mutation.error}</p>}</div></ModalOperacion>}
 {!selected&&mutation.error&&<p className="juegos-error" role="alert">{mutation.error}</p>}
 </section>;
}
