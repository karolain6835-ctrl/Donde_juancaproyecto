import {Target,ArrowLeft} from 'lucide-react';
import './TejoCanchaDisplay.css';

export default function TejoCanchaDisplay({totales,ronda,ultimaJugada,onBack}){
 return <section className="tejo-cancha" aria-label="Pantalla de cancha simulada">
  <header className="tejo-cancha-header"><Target size={32}/><h2>CANCHA DE TEJO 1 · MESA 4</h2><p>Referencias simuladas</p></header>
  <div className="tejo-cancha-equipos">{['a','b'].map(equipo=><div key={equipo} className={'tejo-cancha-equipo equipo-'+equipo} aria-label={`Equipo ${equipo.toUpperCase()}`}><h3>EQUIPO {equipo.toUpperCase()}</h3><strong>{totales[equipo]}</strong></div>)}</div>
  <p className="tejo-cancha-ronda">Ronda {ronda}</p>
  <div className="tejo-cancha-jugada" aria-live="polite"><span>Última jugada simulada</span><strong>{ultimaJugada?`${ultimaJugada.jugador} +${ultimaJugada.puntos}`:'Sin jugadas todavía'}</strong></div>
  <footer><span className="tejo-cancha-demo">MODO DEMOSTRACIÓN</span><p>Puntajes no guardados</p><p>Simulación visual · Sin cámaras ni sensores · Los puntajes no se guardan</p><button type="button" onClick={onBack}><ArrowLeft size={18}/>Volver al control</button></footer>
 </section>;
}
