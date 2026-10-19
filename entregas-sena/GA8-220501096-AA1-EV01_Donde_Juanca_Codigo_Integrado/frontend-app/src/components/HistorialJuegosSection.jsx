import {History} from 'lucide-react';
import {formatDateTime} from '../utils/dateTime';
import {formatCurrency} from '../utils/formatCurrency';
import {estadosSesionJuego,duracionJuego} from '../services/juegosService';
import OperacionRemoteState from './OperacionRemoteState';
export default function HistorialJuegosSection({resource}){
 const rows=(resource.data||[]).filter(s=>s.estado==='cerrada'||s.estado==='cancelada');
 return <section className="juegos-history-section"><div className="juegos-section-heading"><h2>Historial</h2><p>Consulta las sesiones finalizadas y su costo real.</p></div><OperacionRemoteState resource={{...resource,data:rows}} empty="No hay juegos finalizados para mostrar."><div className="juegos-history-grid">{rows.map(s=><article className="juegos-history-card" key={s.id}><header className="juegos-session-heading"><History size={20}/><h3>{s.activo_nombre||'Juego'}</h3><span className={'juegos-badge '+s.estado}>{estadosSesionJuego[s.estado]}</span></header><p className="juegos-history-mesa">Mesa {s.mesa_numero??'—'}</p><dl className="juegos-detail-grid"><div><dt>Inicio</dt><dd>{formatDateTime(s.fecha_inicio)}</dd></div><div><dt>Fin</dt><dd>{formatDateTime(s.fecha_fin)}</dd></div><div><dt>Duración</dt><dd>{duracionJuego(s)}</dd></div><div className="juegos-final-cost"><dt>Costo final</dt><dd>{formatCurrency(s.costo_total)}</dd></div></dl></article>)}</div></OperacionRemoteState></section>;
}
