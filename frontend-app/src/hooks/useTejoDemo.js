import {useReducer} from 'react';

export function crearEstadoTejoDemo(){
 return {ronda:1,jugadores:[
  {id:'demo-karol',nombre:'Karol',equipo:'a',puntaje:0},
  {id:'demo-juan',nombre:'Juan',equipo:'a',puntaje:0},
  {id:'demo-diana',nombre:'Diana',equipo:'b',puntaje:0},
  {id:'demo-carlos',nombre:'Carlos',equipo:'b',puntaje:0},
 ],seleccionado:'',ultimaJugada:null,historial:[],siguienteEvento:1,vista:'control'};
}

export function tejoDemoReducer(state,action){
 switch(action.type){
  case 'seleccionar':return state.jugadores.some(j=>j.id===action.id)?{...state,seleccionado:action.id}:state;
  case 'sumar':{
   const jugador=state.jugadores.find(j=>j.id===state.seleccionado);
   if(!jugador||![1,3,6,9].includes(action.puntos)||!Number.isSafeInteger(jugador.puntaje+action.puntos))return state;
   const evento={id:`tejo-demo-${state.siguienteEvento}`,jugador:jugador.nombre,jugadorId:jugador.id,equipo:jugador.equipo,ronda:state.ronda,puntos:action.puntos,origen:'simulado'};
   return {...state,jugadores:state.jugadores.map(j=>j.id===jugador.id?{...j,puntaje:j.puntaje+action.puntos}:j),ultimaJugada:evento,historial:[...state.historial,evento],siguienteEvento:state.siguienteEvento+1};
  }
  case 'nuevaRonda':return {...state,ronda:state.ronda+1};
  case 'restablecer':return crearEstadoTejoDemo();
  case 'vista':return ['control','cancha'].includes(action.vista)?{...state,vista:action.vista}:state;
  default:return state;
 }
}

export default function useTejoDemo(){
 const [state,dispatch]=useReducer(tejoDemoReducer,undefined,crearEstadoTejoDemo);
 // Totales derivados: una única fuente para ambas vistas, sin duplicar puntajes.
 const totales=state.jugadores.reduce((s,j)=>({...s,[j.equipo]:s[j.equipo]+j.puntaje}),{a:0,b:0});
 return {...state,totales,dispatch};
}
