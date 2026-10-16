import {formatDateTime} from '../utils/dateTime';
import {formatCurrency} from '../utils/formatCurrency';
import {estadosSesionJuego,duracionJuego} from '../services/juegosService';
import OperacionRemoteState from './OperacionRemoteState';
export default function HistorialJuegosSection({resource}){
 const rows=(resource.data||[]).filter(s=>s.estado==='cerrada'||s.estado==='cancelada');
 return <section><h2>Historial</h2><OperacionRemoteState resource={{...resource,data:rows}} empty="No hay juegos finalizados para mostrar."><div className="juegos-real-grid">{rows.map(s=><article className="juegos-real-card" key={s.id}><header><h3>{s.activo_nombre||'Juego'}</h3><span className="juegos-real-badge">{estadosSesionJuego[s.estado]}</span></header><p>Mesa {s.mesa_numero??'—'}</p><p>Inicio: {formatDateTime(s.fecha_inicio)}</p><p>Fin: {formatDateTime(s.fecha_fin)}</p><p>Duración: {duracionJuego(s)}</p><p>Costo final: <strong>{formatCurrency(s.costo_total)}</strong></p></article>)}</div></OperacionRemoteState></section>;
}
