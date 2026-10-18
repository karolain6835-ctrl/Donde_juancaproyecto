import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {diasDashboard,ingresosSemanaDashboard,ingresosHoyDashboard,pedidosDashboard,mesasDashboard,alertasDashboard,pagosDashboard,juegosDashboard,fuenteDashboard} from '../src/services/dashboardService.js';
import {formatTime} from '../src/utils/dateTime.js';
const ahora=new Date('2026-10-16T02:00:00Z');
const pedido={id:'pedido-real',estado:'abierto',mesas_id:'m',usuarios_id:'u',clientes_id:null,mesa_numero:5,responsable_nombre:'Laura real',creado_en:'2026-10-15T16:00:00Z'};
const alerta={id:'a',productos_id:'p',producto:'Producto real',tipo:'bajo',estado:'activa',stock_actual:4,stock_minimo:6,creado_en:'2026-10-15T16:00:00Z',actualizado_en:'2026-10-15T16:00:00Z',resuelto_en:null};
const sesion={id:'s',activos_juego_id:'j',mesas_id:'m',activo_nombre:'Billar real',mesa_numero:5,tipo_juego:'billar',estado:'activa',costo_total:null,fecha_inicio:'2026-10-15T16:00:00Z'};
function responder(u){
 if(u.includes('/pagos?'))return {datos:[],paginacion:{total:999,totalPaginas:999},resumen:{pendientes:3,verificados:9,total_verificado:'12345.67'}};
 if(u.includes('/pedidos?'))return {datos:[pedido],paginacion:{pagina:1,total:51,total_paginas:11}};
 if(u.includes('/inventario/alertas?'))return {alertas:[alerta],total_alertas:21,paginacion:{pagina:1,total:21,total_paginas:5}};
 if(u.includes('/mesas/estado/')){const estado=u.split('/').at(-1);return {datos:[{id:estado,numero:{disponible:1,ocupada:2,en_cobro:3}[estado],estado}]};}
 if(u.includes('/juegos/sesiones'))return {datos:[sesion]};
 assert.fail(u);
}
test('Dashboard compone datos reales y usa conteos completos, no tamaño de página',async()=>{
 const old=globalThis.fetch,urls=[];try{
  globalThis.fetch=async u=>{urls.push(u);return new Response(JSON.stringify(responder(u)));};
  assert.equal((await pedidosDashboard()).paginacion.total,51);assert.equal((await alertasDashboard()).paginacion.total,21);
  assert.deepEqual(await mesasDashboard(),{mesas:[{id:'disponible',numero:1,estado:'disponible'},{id:'ocupada',numero:2,estado:'ocupada'},{id:'en_cobro',numero:3,estado:'en_cobro'}],total:3,disponibles:1,ocupadas:1,en_cobro:1});
  assert.equal((await pagosDashboard()).pendientes,3);assert.equal((await juegosDashboard())[0].activo_nombre,'Billar real');
  assert.ok(urls.some(u=>u.includes('estado=abierto')));assert.ok(urls.some(u=>u.includes('estado=activa')));
 }finally{globalThis.fetch=old;}
});
test('siete días UTC reales, resúmenes completos y suma exacta COP sin sumar páginas',async()=>{
 assert.deepEqual(diasDashboard(ahora),['2026-10-10','2026-10-11','2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16']);
 const old=globalThis.fetch,urls=[];try{
  globalThis.fetch=async u=>{urls.push(u);const q=new URL(u).searchParams;assert.equal(q.get('estado'),'verificado');assert.equal(q.get('desde'),q.get('hasta'));return new Response(JSON.stringify({datos:[],paginacion:{total:99,totalPaginas:99},resumen:{verificados:99,total_verificado:q.get('desde').endsWith('16')?'2844.44':'0.01'}}));};
  const r=await ingresosSemanaDashboard(undefined,ahora);assert.equal(urls.length,7);assert.equal(r.total,'2844.50');assert.equal(r.dias.at(-1).altura,100);assert.equal(r.dias[0].cantidad,99);
  assert.equal((await ingresosHoyDashboard(undefined,ahora)).total,'2844.44');
  globalThis.fetch=async()=>new Response(JSON.stringify({datos:[],paginacion:{},resumen:{verificados:0,total_verificado:'0.00'}}));const cero=await ingresosSemanaDashboard(undefined,ahora);assert.equal(cero.total,'0.00');assert.ok(cero.dias.every(d=>d.altura===0));
 }finally{globalThis.fetch=old;}
});
test('timestamp corresponde a una carga exitosa; errores no generan datos ni hora falsa',async()=>{
 const before=Date.now();const r=await fuenteDashboard(async()=>({real:true}));const after=Date.now();assert.ok(Date.parse(r.cargado_en)>=before&&Date.parse(r.cargado_en)<=after);assert.deepEqual(r.datos,{real:true});await assert.rejects(()=>fuenteDashboard(async()=>{throw new Error('Error real');}),/Error real/);
});
test('Dashboard real renderizado: estructura conservada, permisos y fallo parcial',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'dashboard-real-test',enforce:'pre',transform(s,f){f=f.replaceAll('\\','/');if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {globalThis.__dashboardLoaders.push(loader);return globalThis.__dashboardResources.shift();');}}]});
 const old=globalThis.fetch;
 try{
  const {default:Dashboard}=await server.ssrLoadModule('/src/pages/DashboardPage.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const stamp='2026-10-16T17:42:00Z';const resource=datos=>({data:{datos,cargado_en:stamp},loading:false,error:'',refresh:async()=>{}});
  const recursos=()=>[resource({total:'2844.44',cantidad:2}),resource({datos:[pedido],paginacion:{total:51}}),resource({pendientes:3,verificados:9,total_verificado:'12345.67'}),resource({datos:[alerta],paginacion:{total:21}}),resource({total:'2844.50',dias:diasDashboard(ahora).map((fecha,i)=>({fecha,total:i===6?'2844.44':'0.01',cantidad:1,altura:i===6?100:0.01}))}),resource({total:3,disponibles:1,ocupadas:1,en_cobro:1,mesas:[{id:'m',numero:5,estado:'ocupada'}]}),resource([sesion])];
  const render=(rol='Administrador',r=recursos())=>{globalThis.__dashboardResources=r;globalThis.__dashboardLoaders=[];return renderToString(React.createElement(MemoryRouter,null,React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Dashboard))));};
  await t.test('valores reales, etiquetas correctas y barras con importes reales',()=>{
   const html=render();for(const txt of ['Ingresos verificados hoy','2.844,44','51','21','Producto real','Billar real','Laura real',formatTime(stamp),'pagos confirmados','En cobro'])assert.ok(html.includes(txt),txt);
   assert.ok(!html.includes('UTC'));
   for(const cls of ['dashboard-kpis','dashboard-main-grid','sales-panel','operation-panel','fake-chart','dashboard-secondary-grid','dashboard-bottom-grid'])assert.ok(html.includes(cls),cls);
   assert.match(html,/height:100%/);assert.doesNotMatch(html,/1\.280\.000|7\.800\.000|8%|hace 2 minutos|Estado de caja|Caja abierta|Ronda 3/);
  });
  await t.test('error de pagos no oculta pedidos/mesas/alertas ni inventa ingresos cero',()=>{
   const r=recursos();r[0]={data:null,error:'Error real al cargar ingresos',refresh:async()=>{}};const html=render('Administrador',r);assert.match(html,/Error real al cargar ingresos/);assert.match(html,/Reintentar/);assert.match(html,/Producto real/);assert.match(html,/Laura real/);assert.doesNotMatch(html,/2\.844,44<\/strong>/);
  });
  await t.test('roles solo consultan fuentes autorizadas, sin 403 evitables',async()=>{
   for(const rol of ['Mesero','Mesera','Bartender','Cajero']){
    const urls=[];globalThis.fetch=async u=>{urls.push(u);return new Response(JSON.stringify(responder(u)));};const html=render(rol);await Promise.all(globalThis.__dashboardLoaders.map(loader=>loader({})));
    if(rol!=='Cajero'){assert.ok(urls.every(u=>!u.includes('/pagos?')));assert.doesNotMatch(html,/Ingresos verificados hoy/);}
    if(rol==='Bartender'){assert.ok(urls.every(u=>u.includes('/inventario/alertas?')));assert.doesNotMatch(html,/Operación actual|Juegos activos/);}
    if(rol==='Cajero')assert.ok(urls.every(u=>!u.includes('/inventario/alertas?')));
   }
  });
 }finally{globalThis.fetch=old;delete globalThis.__dashboardResources;delete globalThis.__dashboardLoaders;await server.close();}
});
test('Dashboard no conserva métricas, listas ni porcentajes de demostración',()=>{
 const s=readFileSync(new URL('../src/pages/DashboardPage.jsx',import.meta.url),'utf8');assert.doesNotMatch(s,/1\.280\.000|2\.436\.000|7\.800\.000|\+8%|hace 2 minutos|Laura creó|Ronda 3|height: "35%"/);
});
