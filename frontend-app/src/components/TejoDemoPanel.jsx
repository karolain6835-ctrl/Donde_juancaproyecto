import {Target,Plus,RotateCcw,Monitor,LogOut,Users} from 'lucide-react';
import useTejoDemo from '../hooks/useTejoDemo';
import TejoCanchaDisplay from './TejoCanchaDisplay';
import './TejoDemoPanel.css';

export default function TejoDemoPanel({onExit}){
 const demo=useTejoDemo();
 const {jugadores,totales,ronda,seleccionado,ultimaJugada,vista,dispatch}=demo;
 if(vista==='cancha')return <TejoCanchaDisplay totales={totales} ronda={ronda} ultimaJugada={ultimaJugada} onBack={()=>dispatch({type:'vista',vista:'control'})}/>;
 return <section className="tejo-demo" aria-label="Marcador inteligente de Tejo simulado">
  <header className="tejo-demo-header"><div><span className="tejo-demo-label">MODO DEMOSTRACIÓN · Marcador inteligente</span><p>Simulación visual · Sin cámaras ni sensores · Los puntajes no se guardan</p></div><span className="juegos-badge tejo-demo-badge">Simulación local</span></header>
  <div className="tejo-demo-context"><div className="juegos-icon tejo"><Target size={28}/></div><div><h2>Cancha de Tejo 1 · Mesa 4</h2><p>Referencias simuladas</p></div></div>
  <div className="tejo-demo-equipos">{['a','b'].map(equipo=><article className="juegos-asset-card tejo-demo-equipo" key={equipo} aria-label={`Equipo ${equipo.toUpperCase()}`}><header><h3><Users size={18}/>EQUIPO {equipo.toUpperCase()}</h3><span>Total <strong>{totales[equipo]}</strong></span></header><ul>{jugadores.filter(j=>j.equipo===equipo).map(j=><li key={j.id}><span>{j.nombre}</span><strong>{j.puntaje}</strong></li>)}</ul></article>)}</div>
  <div className="tejo-demo-controls"><span className="tejo-demo-ronda">Ronda {ronda}</span><label>Jugador seleccionado<select value={seleccionado} onChange={e=>dispatch({type:'seleccionar',id:e.target.value})}><option value="" disabled>Selecciona un jugador</option>{['a','b'].map(equipo=><optgroup key={equipo} label={`Equipo ${equipo.toUpperCase()}`}>{jugadores.filter(j=>j.equipo===equipo).map(j=><option key={j.id} value={j.id}>{j.nombre}</option>)}</optgroup>)}</select></label><fieldset><legend>Incrementos de demostración</legend><div className="tejo-demo-incrementos">{[1,3,6,9].map(puntos=><button type="button" key={puntos} disabled={!seleccionado} onClick={()=>dispatch({type:'sumar',puntos})}><Plus size={16}/>{puntos}</button>)}</div><p>Incrementos simulados; no representan reglas oficiales.</p></fieldset></div>
  <div className="tejo-demo-ultima" aria-live="polite" aria-atomic="true"><span>Última jugada simulada</span><strong>{ultimaJugada?`${ultimaJugada.jugador} · +${ultimaJugada.puntos} puntos`:'Sin jugadas todavía'}</strong></div>
  <footer className="tejo-demo-actions"><button type="button" className="drawer-secondary-button" onClick={()=>dispatch({type:'nuevaRonda'})}><Plus size={16}/>Nueva ronda</button><button type="button" className="drawer-secondary-button" onClick={()=>dispatch({type:'restablecer'})}><RotateCcw size={16}/>Restablecer marcador</button><button type="button" className="drawer-primary-button" onClick={()=>dispatch({type:'vista',vista:'cancha'})}><Monitor size={16}/>Pantalla de cancha</button><button type="button" className="drawer-secondary-button" onClick={onExit}><LogOut size={16}/>Salir del modo demo</button></footer>
 </section>;
}
