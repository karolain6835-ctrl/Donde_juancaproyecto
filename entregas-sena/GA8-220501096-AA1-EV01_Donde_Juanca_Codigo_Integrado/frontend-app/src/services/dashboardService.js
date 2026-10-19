import {listarPedidos} from './pedidosService.js';
import {listarMesas} from './mesasService.js';
import {listarAlertas} from './alertasInventarioService.js';
import {listarPagosGlobal} from './pagosService.js';
import {listarSesionesJuego} from './juegosService.js';
import {centavosDivision,decimalDivision} from './divisionesService.js';
import {invalidResponse} from './catalogoContract.js';
import {businessDate,addCalendarDays} from '../utils/businessTime.js';

// Los filtros diarios de pagos usan su fecha de creación en el calendario de Bogotá.
export function diasDashboard(ahora=new Date()){
 const hoy=businessDate(ahora);
 return Array.from({length:7},(_,i)=>addCalendarDays(hoy,i-6));
}
export async function pagosDiaDashboard(fecha,options){
 const r=await listarPagosGlobal({estado:'verificado',desde:fecha,hasta:fecha,pagina:1,limite:1},options);
 centavosDivision(r.resumen.total_verificado);
 if(!Number.isSafeInteger(r.resumen.verificados))throw invalidResponse('resumen de pagos');
 return {fecha,total:r.resumen.total_verificado,cantidad:r.resumen.verificados};
}
export async function ingresosSemanaDashboard(options,ahora=new Date()){
 const dias=await Promise.all(diasDashboard(ahora).map(d=>pagosDiaDashboard(d,options)));
 const cantidades=dias.map(d=>centavosDivision(d.total)),maximo=cantidades.reduce((m,n)=>n>m?n:m,0n);
 return {dias:dias.map((d,i)=>({...d,altura:maximo===0n?0:Number(cantidades[i]*10000n/maximo)/100})),total:decimalDivision(cantidades.reduce((n,v)=>n+v,0n))};
}
export const ingresosHoyDashboard=(options,ahora=new Date())=>pagosDiaDashboard(diasDashboard(ahora).at(-1),options);
export async function pedidosDashboard(options){
 const r=await listarPedidos({estado:'abierto',pagina:1,limite:5},options);
 if(!Number.isSafeInteger(r.paginacion.total)||r.paginacion.total<0)throw invalidResponse('conteo de pedidos');return r;
}
export async function mesasDashboard(options){
 const mesas=await listarMesas(options);
 return {mesas,total:mesas.length,disponibles:mesas.filter(m=>m.estado==='disponible').length,ocupadas:mesas.filter(m=>m.estado==='ocupada').length,en_cobro:mesas.filter(m=>m.estado==='en_cobro').length};
}
export async function alertasDashboard(options){
 const r=await listarAlertas({estado:'activa',pagina:1,limite:5},options);
 if(!Number.isSafeInteger(r.paginacion.total))throw invalidResponse('conteo de alertas');return r;
}
export async function pagosDashboard(options){
 const r=(await listarPagosGlobal({pagina:1,limite:1},options)).resumen;
 if(!['pendientes','verificados'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0))throw invalidResponse('resumen de pagos');
 centavosDivision(r.total_verificado);return r;
}
export const juegosDashboard=options=>listarSesionesJuego('activa',options);
export async function fuenteDashboard(loader,options){
 const datos=await loader(options);
 return {datos,cargado_en:new Date().toISOString()};
}
