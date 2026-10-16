import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {rangoReporte,ventasReporte,productosReporte,inventarioReporte,juegosReporte,cajaReporte,porcentajeReporte} from '../src/services/reportesService.js';
const rango={desde:'2026-10-01',hasta:'2026-10-16'};
const producto={id:'x',nombre:'Producto real',codigo:'X',categoria_nombre:'Bebidas',proveedores_id:'pr',estado:'activo',historial_costos_id:null,categorias_id:1,cantidad_disponible:4,stock_minimo:6,costo_promedio_ponderado:'2844.44',precio_venta:'3000.00'};
const pedido={id:'p',estado:'cerrado',mesas_id:'m',usuarios_id:'u',clientes_id:null,creado_en:'2026-10-16T00:00:00Z'};
const sesion={id:'s',activos_juego_id:'j',mesas_id:'m',activo_nombre:'Billar real',tipo_juego:'billar',estado:'cerrada',fecha_inicio:'2026-10-16T12:00:00Z',fecha_fin:'2026-10-16T12:30:00Z',costo_total:'2844.44'};
test('filtros UTC inclusivos y dinero exacto; rango inválido rechazado',()=>{
 assert.deepEqual(rangoReporte('semana','','',new Date('2026-10-16T00:00:00Z')),{desde:'2026-10-12',hasta:'2026-10-16'});
 assert.deepEqual(rangoReporte('mes','','',new Date('2026-10-16T00:00:00Z')),rango);
 assert.deepEqual(rangoReporte('personalizado',rango.desde,rango.hasta),rango);
 for(const pair of [['',''],['2026-02-30','2026-03-01'],['2026-10-17','2026-10-16']])assert.throws(()=>rangoReporte('personalizado',...pair));
 assert.equal(porcentajeReporte('0.01','0.03'),'33.3');assert.equal(porcentajeReporte(null,'0.00'),'—');
});
test('ventas: resumen backend completo, métodos y evolución real sin sumar solo una página',async()=>{
 const old=globalThis.fetch,urls=[];try{
  globalThis.fetch=async u=>{urls.push(u);return new Response(JSON.stringify({datos:[],paginacion:{total:300,totalPaginas:15},resumen:{total_verificado:'2844.44',verificados:2}}));};
  const r=await ventasReporte({desde:'2026-10-16',hasta:'2026-10-16'},2);assert.equal(r.ventasNetas,'2844.44');assert.equal(r.numeroTransacciones,2);assert.equal(r.ticketPromedio,'1422.22');assert.equal(r.ventasPorHora[0].valor,'2844.44');assert.equal(r.ventasPorHora[0].altura,100);assert.equal(r.paginas,15);assert.ok(urls.every(u=>new URL(u).searchParams.get('estado')==='verificado'));assert.equal(Object.keys(r.metodosPago).length,4);
  const largo=await ventasReporte({desde:'2026-01-01',hasta:'2026-10-16'});assert.equal(largo.serieDisponible,false);assert.deepEqual(largo.ventasPorHora,[]);assert.equal(largo.ventasNetas,'2844.44');
 }finally{globalThis.fetch=old;}
});
test('productos: histórico completo acotado, precios históricos, cancelados excluidos y límite seguro',async()=>{
 const old=globalThis.fetch;let total=1,details=0;try{
  globalThis.fetch=async u=>new Response(JSON.stringify(u.endsWith('/productos')?{datos:[producto]}:u.includes('/pedidos?')?{datos:[pedido],paginacion:{pagina:1,total,total_paginas:1}}:(details++,{datos:{...pedido,items:[{productos_id:'x',nombre:'Producto real',cantidad_pedida:2,precio_unitario:'2844.44',estado:'servido'},{productos_id:'x',cantidad_pedida:999,precio_unitario:'999.00',estado:'cancelado'}]}})));
  const r=await productosReporte(rango);assert.equal(r.rankingDisponible,true);assert.equal(r.unidadesTotales,2);assert.equal(r.ingresosTotales,'5688.88');assert.equal(r.productos[0].promedio,'2844.44');assert.equal(r.productos[0].posicion,1);
  total=201;details=0;const grande=await productosReporte(rango);assert.equal(grande.rankingDisponible,false);assert.equal(details,0);assert.equal(grande.productos[0].producto,'Producto real');assert.equal(grande.productos[0].unidades,null);
  total=2;await assert.rejects(()=>productosReporte(rango),/historial completo/);
 }finally{globalThis.fetch=old;}
});
test('inventario completo, juegos finalizados y caja con fin exclusivo correcto',async()=>{
 const old=globalThis.fetch;const urls=[];try{
  globalThis.fetch=async u=>{urls.push(u);let r;
   if(u.endsWith('/productos'))r={datos:[producto]};
   else if(u.includes('/inventario/movimientos'))r={datos:[],paginacion:{pagina:1,limite:1,total:84,total_paginas:84}};
   else if(u.includes('/inventario/alertas'))r={alertas:[],total_alertas:7,paginacion:{pagina:1,total:7,total_paginas:7}};
   else if(u.includes('/juegos/sesiones'))r={datos:[sesion,{...sesion,id:'s2',estado:'activa',fecha_fin:null,costo_total:null}]};
   else if(u.endsWith('/juegos/activos'))r={datos:[{id:'j',nombre:'Billar real',estado:'disponible',tipo:'billar',precio_hora:'12000.00'}]};
   else if(u.includes('/pagos?'))r={datos:[],paginacion:{},resumen:{total_verificado:'50000.00',verificados:4,pendientes:2}};
   else if(u.includes('/cierres-caja?'))r={total:40,datos:[{id:'c',fecha:'2026-10-16T12:00:00Z',total_general:'20000.00',total_efectivo_real:'9000.00',total_efectivo_esperado:'10000.00',diferencia_efectivo:'-1000.00'}]};
   else assert.fail(u);return new Response(JSON.stringify(r));
  };
  const inv=await inventarioReporte();assert.equal(inv.valorInventario,'11377.76');assert.equal(inv.stockBajo,1);assert.equal(inv.movimientos,84);assert.equal(inv.alertasActivas,7);
  const juego=await juegosReporte(rango);assert.equal(juego.totalSesiones,2);assert.equal(juego.ingresosTotales,'2844.44');assert.equal(juego.totalMinutos,30);assert.equal(juego.sesiones[1].ingresos,null);assert.equal(juego.sesiones[1].duracionMin,null);
  const caja=await cajaReporte(rango,2);assert.equal(caja.totalIngresos,'50000.00');assert.equal(caja.totalSalidas,2);assert.equal(caja.diferenciaTotal,'-1000.00');assert.equal(caja.paginas,2);const q=new URL(urls.find(u=>u.includes('/cierres-caja?'))).searchParams;assert.equal(q.get('fecha_inicio'),'2026-10-01T00:00:00');assert.equal(q.get('fecha_fin'),'2026-10-17T00:00:00');
 }finally{globalThis.fetch=old;}
});
test('ranking obtiene ambas páginas y aplica límites de fecha a todo el conjunto',async()=>{
 const old=globalThis.fetch;const ordenes=Array.from({length:101},(_,i)=>({...pedido,id:'p'+i}));let paginas=new Set();
 try{
  globalThis.fetch=async u=>{let r;
   if(u.endsWith('/productos'))r={datos:[producto]};
   else if(u.includes('/pedidos?')){const q=new URL(u).searchParams,p=Number(q.get('pagina')),limite=Number(q.get('limite'));paginas.add(p);r={datos:ordenes.slice((p-1)*limite,p*limite),paginacion:{pagina:p,total:101,total_paginas:Math.ceil(101/limite)}};}
   else {const id=u.split('/').at(-1);r={datos:{...pedido,id,creado_en:id==='p100'?'2026-10-17T00:00:00Z':'2026-10-16T23:59:59Z',items:[{productos_id:'x',nombre:'Producto real',cantidad_pedida:1,precio_unitario:'0.01',estado:'servido'}]}};}
   return new Response(JSON.stringify(r));
  };
  const r=await productosReporte(rango);assert.ok(paginas.has(2));assert.equal(r.unidadesTotales,100);assert.equal(r.ingresosTotales,'1.00');
 }finally{globalThis.fetch=old;}
});
test('las cinco pestañas conservan su estructura visual y manejan error, vacío, datos y permisos',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'reportes-test',enforce:'pre',transform(s,f){f=f.replaceAll('\\','/');if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {globalThis.__reportLoaders.push(loader);return globalThis.__reportResource;');}}]});
 try{
  const {AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const render=(C,rol='Administrador')=>{globalThis.__reportLoaders=[];return renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(C)));};
  const datos={Ventas:{ventasNetas:'2844.44',numeroTransacciones:2,ticketPromedio:'1422.22',metodosPago:{Efectivo:'2844.44'},metodoPrincipal:'Efectivo',ventasPorHora:[{hora:'2026-10-16',valor:'2844.44',altura:100}],transacciones:[],serieDisponible:true},Productos:{productos:[],unidadesTotales:0,ingresosTotales:'0.00',categoriaLider:'Sin datos',rankingDisponible:true},Inventario:{productosCriticos:[],categorias:[],valorInventario:'0.00',stockBajo:0,agotados:0,movimientos:0,alertasActivas:0},Juegos:{sesiones:[],resumenPorTipo:{},totalSesiones:0,totalMinutos:0,ingresosTotales:'0.00',duracionPromedio:0,juegoMasUsado:'Sin datos'},Caja:{cierres:[],totalIngresos:'0.00',totalSalidas:0,balanceTotal:0,diferenciaTotal:'0.00'}};
  for(const name of Object.keys(datos))await t.test(name,async()=>{
   const {default:C}=await server.ssrLoadModule('/src/components/Reporte'+name+'Section.jsx');
   globalThis.__reportResource={data:datos[name],refresh:async()=>{}};const html=render(C);assert.match(html,/No hay/);assert.ok(html.includes('reporte-'+name.toLowerCase()+'-kpis'));assert.ok(html.includes('reporte-'+name.toLowerCase()+'-table'));assert.doesNotMatch(html,/TX-1048|CJ-041|SES-090|2610000/);
   const filas={Ventas:{transacciones:[{id:'pago-real',hora:'16/10/26',mesa:'Mesa 5',pedido:'p',metodo:'Efectivo',total:'2844.44',responsable:'Ana'}]},Productos:{productos:[{id:'x',producto:'Producto real',categoria:'Bebidas',unidades:2,ingresos:'5688.88',posicion:1,promedio:'2844.44'}],unidadesTotales:2,ingresosTotales:'5688.88'},Inventario:{productosCriticos:[{id:'x',producto:'Producto real',categoria:'Bebidas',stock:4,minimo:6,valor:'11377.76',estado:'bajo'}],categorias:[{nombre:'Bebidas',valor:'11377.76',porcentaje:100}]},Juegos:{sesiones:[{id:'s',juego:'Billar real',tipo:'Billar',mesa:'Mesa 5',fecha:'16/10/26',duracionMin:30,ingresos:'2844.44',responsable:'No disponible'}],resumenPorTipo:{Billar:{sesiones:1,minutos:30,ingresos:'2844.44'}}},Caja:{cierres:[{id:'c',fecha:'16/10/26',responsable:'Ana',ingresos:'20000.00',salidas:'9000.00',balance:'10000.00',diferencia:'-1000.00',estado:'diferencia'}]}};
   globalThis.__reportResource={data:{...datos[name],...filas[name]},refresh:async()=>{}};assert.match(render(C),/Ver detalle/);
   globalThis.__reportResource={data:null,error:'Error real de reporte',refresh:async()=>{}};assert.match(render(C),/Error real de reporte/);assert.match(render(C),/Reintentar/);
   globalThis.__reportResource={data:null,loading:true};assert.match(render(C),/Cargando reporte/);
   render(C,'Bartender');assert.equal(await globalThis.__reportLoaders[0]({}),null);
  });
 }finally{delete globalThis.__reportResource;delete globalThis.__reportLoaders;await server.close();}
});
test('se retiraron las colecciones ficticias de cada pestaña',()=>{
 for(const n of ['Ventas','Productos','Inventario','Juegos','Caja']){const s=readFileSync(new URL('../src/components/Reporte'+n+'Section.jsx',import.meta.url),'utf8');assert.doesNotMatch(s,/TX-1048|CJ-041|SES-090|2610000|valor: 2280000|ingresos: 588000/);}
});
