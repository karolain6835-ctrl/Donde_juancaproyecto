import {apiClient} from './apiClient.js';
import {operationPath,operationFail} from './operacionContract.js';
import {invalidResponse} from './catalogoContract.js';
import {montoCOP,centavosDivision,decimalDivision} from './divisionesService.js';
import {businessDateTime,businessToUTC} from '../utils/businessTime.js';
export function fechaLocalCierre(date=new Date()){
 return businessDateTime(date);
}
export function periodoCierre(form){
 const fechas=['fecha_inicio','fecha_fin'].map(k=>{
  const v=form[k];if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v))operationFail('Indica las fechas y horas del período.');
  try{return businessToUTC(v);}catch{operationFail('Fecha inválida.');}
 });
 if(fechas[0]>=fechas[1])operationFail('La fecha inicial debe ser anterior a la final.');
 return Object.fromEntries(['fecha_inicio','fecha_fin'].map((k,i)=>[k,fechas[i].toISOString().slice(0,19)]));
}
export function arqueoCierre(contado,esperado){
 const real=montoCOP(contado),diferencia=real-centavosDivision(esperado),absoluto=diferencia<0n?-diferencia:diferencia;
 return {total_efectivo_real:decimalDivision(real),diferencia:`${diferencia<0n?'-':''}${decimalDivision(absoluto)}`,tipo:diferencia===0n?'Sin diferencia':diferencia>0n?'Sobrante':'Faltante'};
}
export async function resumenCierre(periodo,options){
 const data=await apiClient(`/cierres-caja/resumen?${new URLSearchParams(periodo)}`,options);
 if(!Array.isArray(data?.pagos)||!Number.isInteger(data.cantidad_pagos)||!data.por_metodo)throw invalidResponse('resumen de cierre');
 centavosDivision(data.efectivo_esperado);centavosDivision(data.total_general);return data;
}
export async function listarCierres(filtros,options){
 const q=new URLSearchParams(Object.entries(filtros).filter(([,v])=>v!==''&&v!=null));
 const data=await apiClient(`/cierres-caja?${q}`,options);
 if(!Array.isArray(data?.datos)||!Number.isInteger(data.total))throw invalidResponse('cierres');return data;
}
export async function detalleCierre(id,options){
 const data=(await apiClient(`/cierres-caja/${operationPath(id)}`,options))?.cierre;
 if(data?.id!==id||!Array.isArray(data.pagos)||!data.reporte)throw invalidResponse('detalle de cierre');return data;
}
export async function crearCierre(periodo,contado){
 const body={...periodo,total_efectivo_real:arqueoCierre(contado,'0.00').total_efectivo_real};
 const data=(await apiClient('/cierres-caja',{method:'POST',body}))?.cierre;
 if(typeof data?.id!=='string'||!Array.isArray(data.pagos))throw invalidResponse('cierre');return data;
}
