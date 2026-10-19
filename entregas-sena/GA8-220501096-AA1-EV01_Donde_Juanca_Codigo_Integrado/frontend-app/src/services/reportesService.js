import {listarPagosGlobal,metodosPago as nombresMetodos} from './pagosService.js';
import {listarProductos} from './productosService.js';
import {listarPedidos,detallePedido} from './pedidosService.js';
import {listarMovimientos} from './inventarioService.js';
import {listarAlertas} from './alertasInventarioService.js';
import {listarSesionesJuego,listarActivosJuego,tiposJuego} from './juegosService.js';
import {listarCierres} from './cierresCajaService.js';
import {centavosDivision,decimalDivision} from './divisionesService.js';
import {formatDateTime} from '../utils/dateTime.js';
import {businessDate,businessDayStart,addCalendarDays} from '../utils/businessTime.js';
export const LIMITE_PEDIDOS_REPORTE=200;
const falla=mensaje=>{throw new Error(mensaje);};
export const decimalReporte=n=>n<0n?'-'+decimalDivision(-n):decimalDivision(n);
export const centavosReporte=v=>String(v).startsWith('-')?-centavosDivision(String(v).slice(1)):centavosDivision(v);
export function porcentajeReporte(valor,total){
 if(valor==null||total==null)return '—';
 const n=centavosReporte(valor),d=centavosReporte(total);return d>0n&&n>=0n?(Number(n*1000n/d)/10).toFixed(1):'0.0';
}
const suma=valores=>decimalReporte(valores.reduce((n,v)=>n+centavosReporte(v),0n));
export function rangoReporte(periodo,desde,hasta,ahora=new Date()){
 const fin=new Date(businessDate(ahora)+'T00:00:00Z'),inicio=new Date(fin);
 if(periodo==='semana')inicio.setUTCDate(inicio.getUTCDate()-((inicio.getUTCDay()+6)%7));
 else if(periodo==='mes')inicio.setUTCDate(1);
 else if(periodo==='personalizado'){
  for(const f of [desde,hasta])if(typeof f!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(f)||!Number.isFinite(Date.parse(f))||new Date(f).toISOString().slice(0,10)!==f)falla('Selecciona fechas válidas para el período.');
  if(desde>hasta)falla('La fecha inicial debe ser anterior o igual a la final.');return {desde,hasta};
 }else if(periodo!=='hoy')falla('Período inválido.');
 return {desde:inicio.toISOString().slice(0,10),hasta:fin.toISOString().slice(0,10)};
}
const dentro=(fecha,r)=>{
 if(typeof fecha!=='string'||!Number.isFinite(Date.parse(fecha)))falla('El historial contiene una fecha inválida.');
 return Date.parse(fecha)>=businessDayStart(r.desde).getTime()&&Date.parse(fecha)<businessDayStart(addCalendarDays(r.hasta,1)).getTime();
};
export async function ventasReporte(r,pagina=1,options){
 const [listado,metodos]=await Promise.all([listarPagosGlobal({...r,estado:'verificado',pagina,limite:20},options),Promise.all(Object.keys(nombresMetodos).map(async k=>[nombresMetodos[k],(await listarPagosGlobal({...r,estado:'verificado',metodo_de_pago:k,pagina:1,limite:1},options)).resumen.total_verificado]))]);
 const inicio=Date.parse(r.desde+'T00:00:00Z'),numeroDias=(Date.parse(r.hasta+'T00:00:00Z')-inicio)/86400000+1;
 const serie=numeroDias<=31?await Promise.all(Array.from({length:numeroDias},async(_,i)=>{const fecha=new Date(inicio+i*86400000).toISOString().slice(0,10);const v=await listarPagosGlobal({estado:'verificado',desde:fecha,hasta:fecha,pagina:1,limite:1},options);return {hora:fecha,valor:v.resumen.total_verificado};})):[];
 const max=serie.reduce((m,d)=>centavosDivision(d.valor)>m?centavosDivision(d.valor):m,0n),total=centavosDivision(listado.resumen.total_verificado),cantidad=listado.resumen.verificados;
 return {ventasNetas:decimalDivision(total),numeroTransacciones:cantidad,ticketPromedio:cantidad?decimalDivision((total+BigInt(Math.floor(cantidad/2)))/BigInt(cantidad)):'0.00',metodosPago:Object.fromEntries(metodos),metodoPrincipal:metodos.filter(([,v])=>centavosDivision(v)>0n).sort((a,b)=>centavosDivision(a[1])>centavosDivision(b[1])?-1:1)[0]?.[0]||'Sin pagos',ventasPorHora:serie.map(d=>({...d,altura:max?Number(centavosDivision(d.valor)*10000n/max)/100:0})),serieDisponible:numeroDias<=31,transacciones:listado.datos.map(p=>({id:p.id,hora:formatDateTime(p.creado_en),mesa:p.mesa_numero==null?'—':`Mesa ${p.mesa_numero}`,pedido:p.pedidos_id,total:p.total_seleccionado,metodo:nombresMetodos[p.metodo_de_pago],responsable:p.registrado_por||'—'})),paginas:listado.paginacion.totalPaginas,total:listado.paginacion.total};
}
export async function productosReporte(r,options){
 const [catalogo,primera]=await Promise.all([listarProductos(options),listarPedidos({estado:'cerrado',pagina:1,limite:100},options)]);
 if(primera.paginacion.total>LIMITE_PEDIDOS_REPORTE)return {rankingDisponible:false,productos:catalogo.map(p=>({id:p.id,producto:p.nombre,categoria:p.categoria,unidades:null,ingresos:null,posicion:null})),unidadesTotales:'—',ingresosTotales:null,categoriaLider:'—'};
 let orders=[...primera.datos];
 for(let pagina=2;pagina<=primera.paginacion.total_paginas;pagina++){const p=await listarPedidos({estado:'cerrado',pagina,limite:100},options);if(p.paginacion.total!==primera.paginacion.total)falla('El historial cambió. Actualiza el reporte.');orders.push(...p.datos);}
 if(orders.length!==primera.paginacion.total||new Set(orders.map(p=>p.id)).size!==orders.length)falla('No se pudo obtener el historial completo.');
 const grupos=new Map();
 // Máximo cinco lecturas concurrentes; nunca sumar solo una página del histórico.
 for(let offset=0;offset<orders.length;offset+=5){
  const detalles=await Promise.all(orders.slice(offset,offset+5).map(p=>detallePedido(p.id,options)));
  for(const p of detalles){if(p.estado!=='cerrado')falla('El historial cambió. Actualiza el reporte.');if(!dentro(p.creado_en,r))continue;
   for(const i of p.items){if(i.estado==='cancelado')continue;if(!Number.isSafeInteger(i.cantidad_pedida)||i.cantidad_pedida<=0)falla('Cantidad histórica inválida.');
    const g=grupos.get(i.productos_id)||{id:i.productos_id,producto:i.nombre,categoria:catalogo.find(c=>c.id===i.productos_id)?.categoria||'Sin categoría disponible',unidades:0,importe:0n};g.unidades+=i.cantidad_pedida;g.importe+=centavosDivision(i.precio_unitario)*BigInt(i.cantidad_pedida);grupos.set(g.id,g);
   }
  }
 }
 const control=await listarPedidos({estado:'cerrado',pagina:1,limite:1},options);if(control.paginacion.total!==primera.paginacion.total)falla('El historial cambió. Actualiza el reporte.');
 const productos=[...grupos.values()].sort((a,b)=>b.unidades-a.unidades||a.id.localeCompare(b.id)).map((p,i)=>({...p,ingresos:decimalDivision(p.importe),promedio:decimalDivision((p.importe+BigInt(Math.floor(p.unidades/2)))/BigInt(p.unidades)),posicion:i+1}));
 const categorias=new Map();for(const p of productos)categorias.set(p.categoria,(categorias.get(p.categoria)||0n)+p.importe);
 return {rankingDisponible:true,productos,unidadesTotales:productos.reduce((n,p)=>n+p.unidades,0),ingresosTotales:suma(productos.map(p=>p.ingresos)),categoriaLider:[...categorias].sort((a,b)=>a[1]>b[1]?-1:1)[0]?.[0]||'Sin datos'};
}
export async function inventarioReporte(options){
 const [catalogo,mov,alertas]=await Promise.all([listarProductos(options),listarMovimientos({pagina:1,limite:1},options),listarAlertas({estado:'activa',pagina:1,limite:1},options)]);
 const proyeccion=catalogo.map(p=>({id:p.id,producto:p.nombre,categoria:p.categoria,stock:p.stock,minimo:p.minimo,valor:decimalReporte(centavosDivision(p.costo)*BigInt(p.stock)),estado:p.estadoStock}));
 const valor=suma(proyeccion.map(p=>p.valor)),total=centavosReporte(valor);const categorias=new Map();
 for(const p of proyeccion)categorias.set(p.categoria,(categorias.get(p.categoria)||0n)+centavosReporte(p.valor));
 return {valorInventario:valor,stockBajo:catalogo.filter(p=>p.estadoStock==='bajo').length,agotados:catalogo.filter(p=>p.estadoStock==='agotado').length,movimientos:mov.paginacion.total,alertasActivas:alertas.paginacion.total,productosCriticos:proyeccion.filter(p=>p.estado!=='normal'),categorias:[...categorias].map(([nombre,v])=>({nombre,valor:decimalReporte(v),porcentaje:total>0n&&v>0n?Number(v*1000n/total)/10:0}))};
}
export async function juegosReporte(r,options){
 const [rows,activos]=await Promise.all([listarSesionesJuego(undefined,options),listarActivosJuego(options)]),sesiones=rows.filter(s=>dentro(s.fecha_inicio,r));
 const finales=sesiones.filter(s=>s.estado==='cerrada'&&s.fecha_fin&&Date.parse(s.fecha_fin)>=Date.parse(s.fecha_inicio));
 const seg=s=>Math.floor((Date.parse(s.fecha_fin)-Date.parse(s.fecha_inicio))/1000),resumen={};
 for(const s of sesiones){const tipo=tiposJuego[s.tipo_juego]||tiposJuego[activos.find(a=>a.id===s.activos_juego_id)?.tipo]||'Juego';const g=resumen[tipo]||(resumen[tipo]={sesiones:0,minutos:0,importe:0n});g.sesiones++;if(finales.includes(s))g.minutos+=seg(s)/60;if(s.estado==='cerrada'&&s.costo_total!=null)g.importe+=centavosDivision(s.costo_total);}
 return {totalSesiones:sesiones.length,totalMinutos:Math.floor(finales.reduce((n,s)=>n+seg(s),0)/60),duracionPromedio:finales.length?Math.round(finales.reduce((n,s)=>n+seg(s),0)/60/finales.length):0,ingresosTotales:suma(sesiones.filter(s=>s.estado==='cerrada'&&s.costo_total!=null).map(s=>s.costo_total)),juegoMasUsado:Object.entries(resumen).sort((a,b)=>b[1].sesiones-a[1].sesiones)[0]?.[0]||'Sin datos',resumenPorTipo:Object.fromEntries(Object.entries(resumen).map(([k,g])=>[k,{sesiones:g.sesiones,minutos:Math.floor(g.minutos),ingresos:decimalDivision(g.importe)}])),sesiones:sesiones.map(s=>({id:s.id,juego:s.activo_nombre||'Juego',tipo:tiposJuego[s.tipo_juego]||'Juego',mesa:s.mesa_numero==null?'—':`Mesa ${s.mesa_numero}`,fecha:formatDateTime(s.fecha_inicio),duracionMin:finales.includes(s)?Math.floor(seg(s)/60):null,ingresos:s.estado==='cerrada'?s.costo_total:null,responsable:'No disponible',estado:s.estado}))};
}
export async function cajaReporte(r,pagina,options){
 const inicio=businessDayStart(r.desde).toISOString().slice(0,19),fin=businessDayStart(addCalendarDays(r.hasta,1)).toISOString().slice(0,19);
 const [p,c]=await Promise.all([listarPagosGlobal({...r,pagina:1,limite:1},options),listarCierres({pagina,limite:20,fecha_inicio:inicio,fecha_fin:fin},options)]);
 const cierres=c.datos.map(v=>({id:v.id,fecha:formatDateTime(v.fecha),responsable:v.responsable_nombre||'—',ingresos:v.total_general,salidas:v.total_efectivo_real,balance:v.total_efectivo_esperado,diferencia:decimalReporte(centavosReporte(v.diferencia_efectivo)),estado:centavosReporte(v.diferencia_efectivo)===0n?'cuadrado':'diferencia'}));
 return {cierres,totalIngresos:p.resumen.total_verificado,totalSalidas:p.resumen.pendientes,balanceTotal:p.resumen.verificados,diferenciaTotal:suma(cierres.map(c=>c.diferencia)),paginas:Math.ceil(c.total/20),total:c.total};
}
export async function cargarReporte(tipo,r,pagina,options){
 if(tipo==='ventas')return ventasReporte(r,pagina,options);if(tipo==='productos')return productosReporte(r,options);if(tipo==='inventario')return inventarioReporte(options);if(tipo==='juegos')return juegosReporte(r,options);if(tipo==='caja')return cajaReporte(r,pagina,options);falla('Reporte inválido.');
}
