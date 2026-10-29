import {useReducer} from 'react';
import {Refrigerator,Thermometer,DoorClosed,DoorOpen,Package,TriangleAlert,CircleCheck,RotateCcw,ArrowRight} from 'lucide-react';
import './RefrigeradorDemoPanel.css';

const inicial={temperaturaAlta:false,puertaAbierta:false,stockBajo:false};
function reducer(state,action){
 if(action.type==='restablecer')return inicial;
 return {...state,[action.campo]:action.valor};
}

export default function RefrigeradorDemoPanel({onExit}){
 const [estado,dispatch]=useReducer(reducer,inicial);
 const variables=[
  {campo:'temperaturaAlta',nombre:'Temperatura',Icon:Thermometer,valor:estado.temperaturaAlta?'11 °C':'4 °C',opciones:['Normal','Alta'],mensaje:'Temperatura fuera del rango esperado'},
  {campo:'puertaAbierta',nombre:'Puerta',Icon:estado.puertaAbierta?DoorOpen:DoorClosed,valor:estado.puertaAbierta?'Abierta':'Cerrada',opciones:['Cerrada','Abierta'],mensaje:'Puerta abierta por demasiado tiempo'},
  {campo:'stockBajo',nombre:'Stock',Icon:Package,valor:estado.stockBajo?'4 unidades':'20 unidades',opciones:['Normal','Bajo'],mensaje:'Stock bajo de bebidas'},
 ];
 const alertas=variables.filter(v=>estado[v.campo]);
 return <section className="refrigerador-demo" aria-label="Modo demostración IoT">
  <header className="refrigerador-demo-header">
   <div><span className="refrigerador-demo-label">MODO DEMOSTRACIÓN · IoT simulado</span><p>Datos temporales · Sin sensores · No se guardan</p></div>
   <span className="refrigerador-status refrigerador-demo-badge">Simulación local</span>
  </header>
  <div className="refrigerador-demo-title"><div className="refrigerador-icon"><Refrigerator size={25}/></div><div><h2>Refrigerador DEMO</h2><p>Cambia los escenarios para explorar sus indicadores y alertas simuladas.</p></div></div>
  <div className="refrigerador-demo-grid">
   {variables.map(({campo,nombre,Icon,valor,opciones})=><article className={'refrigerador-demo-metric '+(estado[campo]?'con-incidencia':'')} key={campo} aria-label={`${nombre}: datos simulados`}>
    <div className="refrigerador-demo-metric-heading"><Icon size={22}/><span>{nombre}</span><span className="refrigerador-demo-tag">Simulado</span></div>
    <strong className="refrigerador-demo-value">{valor}</strong>
    <span className={'refrigerador-demo-condition '+(estado[campo]?'warning':'normal')}>{estado[campo]?opciones[1]:opciones[0]}</span>
    <fieldset className="refrigerador-demo-controls"><legend>{nombre}</legend>{opciones.map((opcion,index)=><button key={opcion} type="button" aria-pressed={estado[campo]===Boolean(index)} onClick={()=>dispatch({campo,valor:Boolean(index)})}>{opcion}</button>)}</fieldset>
   </article>)}
  </div>
  <section className="refrigerador-demo-alerts" aria-labelledby="refrigerador-demo-alerts-title">
   <h3 id="refrigerador-demo-alerts-title">Alertas simuladas <span>{alertas.length}</span></h3>
   <div aria-live="polite" aria-atomic="true">{alertas.length?<ul>{alertas.map(a=><li key={a.campo}><TriangleAlert size={19}/><div><span className="refrigerador-demo-tag">Alerta simulada</span><p>{a.mensaje}</p></div></li>)}</ul>:<p className="refrigerador-demo-ok"><CircleCheck size={20}/>Sin incidencias en este escenario</p>}</div>
  </section>
  <footer className="refrigerador-demo-actions"><button type="button" className="drawer-secondary-button" onClick={()=>dispatch({type:'restablecer'})}><RotateCcw size={16}/>Restablecer simulación</button><button type="button" className="drawer-primary-button" onClick={onExit}>Salir del modo demo<ArrowRight size={16}/></button></footer>
 </section>;
}
