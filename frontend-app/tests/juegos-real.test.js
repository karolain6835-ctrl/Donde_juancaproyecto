import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {listarActivosJuego,listarSesionesJuego,inicioJuegoBody,iniciarJuego,finalizarJuego,duracionJuego} from '../src/services/juegosService.js';
const activo={id:'a',nombre:'Billar real',tipo:'billar',estado:'disponible',precio_hora:'12000.00',sesiones_activas:[]};
const sesion={id:'s',activos_juego_id:'a',activo_nombre:'Billar real',mesas_id:'m',mesa_numero:5,pedidos_id:'p',pedido_items_id:null,estado:'activa',tarifa_hora_aplicada:'12000.00',costo_total:null,fecha_inicio:'2026-10-15T15:00:00Z',fecha_fin:null};
const cerrada={...sesion,estado:'cerrada',costo_total:'6000.00',fecha_fin:'2026-10-15T15:30:00Z'};
const pedido={id:'p',estado:'abierto',mesas_id:'m',cliente_nombre:'Carlos'};
const recurso=data=>({data,loading:false,error:'',refresh:async()=>{}});
test('servicio real: rutas, inicio con pedido, finalización y costo persistido',async()=>{
 const old=globalThis.fetch;const calls=[];
 try{
  globalThis.fetch=async(u,o)=>{calls.push([u,o]);return new Response(JSON.stringify(u.endsWith('/activos')?{datos:[activo]}:u.includes('/sesiones')?{datos:[sesion,cerrada]}:o.method==='POST'?{id_sesion:'s',datos:sesion}:{id_sesion:'s',datos:cerrada,total_cobrado:'6000.00'}),{status:o.method==='POST'?201:200});};
  assert.deepEqual(await listarActivosJuego(),[activo]);assert.equal((await listarSesionesJuego()).length,2);
  const body=inicioJuegoBody(activo,'m',pedido,[{id:'m'}]);assert.deepEqual(body,{activos_juego_id:'a',mesas_id:'m',pedidos_id:'p'});
  await iniciarJuego(body);assert.equal((await finalizarJuego('s')).total_cobrado,'6000.00');
  assert.match(calls[2][0],/\/juegos\/iniciar$/);assert.deepEqual(JSON.parse(calls[2][1].body),body);
  assert.match(calls[3][0],/\/juegos\/s\/terminar$/);assert.equal(calls[3][1].method,'PUT');
  assert.equal(duracionJuego(cerrada),'0 h 30 min 0 s');assert.equal(duracionJuego(sesion),'—');
 }finally{globalThis.fetch=old;}
});
test('inicio rechaza activo ocupado, mesa falsa y pedido cerrado/ajeno; errores del servidor',async()=>{
 for(const [a,m,p] of [[{...activo,estado:'ocupado'},'m',pedido],[activo,'otra',pedido],[activo,'m',{...pedido,estado:'cerrado'}],[activo,'m',{...pedido,mesas_id:'otra'}]])assert.throws(()=>inicioJuegoBody(a,m,p,[{id:'m'}]));
 const old=globalThis.fetch;try{globalThis.fetch=async()=>new Response(JSON.stringify({error:'El activo no está disponible.'}),{status:409});await assert.rejects(()=>iniciarJuego({}),/no está disponible/);}finally{globalThis.fetch=old;}
});
test('Juegos real renderizado: activos, sesiones, historial, permisos y operaciones',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'juegos-test',enforce:'pre',transform(s,f){
  f=f.replaceAll('\\','/');
  if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {return globalThis.__juegoResources.shift();');
  if(f.endsWith('/pages/JuegosPage.jsx'))return s.replace("useState('activos')","useState(globalThis.__juegoTab||'activos')").replace('if(!permitido)return','globalThis.__juegoChanged=changed;globalThis.__juegoRefresh=refresh;if(!permitido)return');
  if(f.endsWith('/components/JuegoInicioForm.jsx'))return s.replace("[mesaId,setMesaId]=useState(''),[pedidoId,setPedidoId]=useState('')","[mesaId,setMesaId]=useState('m'),[pedidoId,setPedidoId]=useState('p')").replace('return <section','globalThis.__juegoSubmit=submit;return <section');
  if(f.endsWith('/components/SesionesJuegosSection.jsx'))return s.replace('useState(null)','useState(globalThis.__juegoSelected||null)').replace('return <section','globalThis.__juegoConfirmar=confirmar;return <section');
 }}]});
 const old=globalThis.fetch;
 try{
  const {default:Page}=await server.ssrLoadModule('/src/pages/JuegosPage.jsx'),{default:Form}=await server.ssrLoadModule('/src/components/JuegoInicioForm.jsx'),{default:Sessions}=await server.ssrLoadModule('/src/components/SesionesJuegosSection.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const render=(Component,props={},rol='Mesera')=>renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Component,props)));
  const page=(tab='activos',rol='Mesera',assets=recurso([activo]),sessions=recurso([sesion,cerrada]))=>{globalThis.__juegoTab=tab;globalThis.__juegoResources=[assets,sessions,recurso([{id:'m',numero:5}])];return render(Page,{},rol);};
  await t.test('catálogo y permisos de lectura/operación coinciden con backend',()=>{
   for(const rol of ['Administrador','SuperAdmin','Mesero','Mesera'])assert.match(page('activos',rol,recurso([activo]),recurso([])),/Iniciar juego/);
   assert.match(page('activos','Cajero'),/Billar real/);assert.doesNotMatch(page('activos','Cajero'),/Iniciar juego/);
   assert.match(page('activos','Bartender'),/No tienes permiso/);
   assert.match(page('sesiones'),/Finalizar juego/);assert.doesNotMatch(page('sesiones','Cajero'),/Finalizar juego/);
  });
  await t.test('historial real, duración, activos sin costo inventado, mantenimiento honesto',()=>{
   const history=page('historial');assert.match(history,/Billar real/);assert.match(history,/6\.000/);assert.match(history,/0 h 30 min 0 s/);
   const active=page('sesiones');assert.match(active,/Mesa (?:<!-- -->)?5/);assert.match(active,/costo final se calcula/);assert.doesNotMatch(active,/6\.000/);
   assert.match(page('mantenimiento'),/Mantenimiento de juegos/);assert.doesNotMatch(page('mantenimiento'),/Programar|Registrar mantenimiento/);
  });
  await t.test('vacío, cargando y error con reintentar',()=>{
   assert.match(page('activos','Mesera',recurso([])),/No hay juegos disponibles/);
   assert.match(page('sesiones','Mesera',recurso([]),recurso([])),/No hay sesiones activas/);
   assert.match(page('activos','Mesera',{...recurso([]),loading:true}),/Cargando/);
   const html=page('activos','Mesera',{...recurso([]),error:'No fue posible cargar juegos'});assert.match(html,/No fue posible cargar juegos/);assert.match(html,/Reintentar/);
  });
  await t.test('reintentar recarga catálogos; operación confirmada reconsulta mesa y pedido',async()=>{
   let reads=0;const remote=data=>({...recurso(data),refresh:async()=>reads++});
   page('activos','Mesera',remote([activo]),remote([]));await globalThis.__juegoRefresh();assert.equal(reads,2);
   const urls=[];globalThis.fetch=async u=>{urls.push(u);return new Response(JSON.stringify(u.endsWith('/cuenta')?{data:{resumen:{},detalle_productos:[],detalle_juegos:[]}}:{datos:{...pedido,usuarios_id:'u',clientes_id:null,items:[]}}));};
   await globalThis.__juegoChanged({datos:cerrada,total_cobrado:'6000.00'});assert.equal(reads,4);assert.ok(urls.some(u=>u.endsWith('/mesas/m/cuenta')));assert.ok(urls.some(u=>u.endsWith('/pedidos/p')));
  });
  await t.test('formulario inicia con pedido real y espera reconsulta; no muta datos',async()=>{
   let changed=0,cancelled=0,body;globalThis.__juegoResources=[recurso({datos:[pedido]})];
   assert.match(render(Form,{activo,mesas:recurso([{id:'m',numero:5}]),onChanged:async r=>{assert.equal(r.datos.pedidos_id,'p');changed++;},onCancel:()=>cancelled++}),/Carlos/);
   globalThis.fetch=async(u,o)=>{body=JSON.parse(o.body);return new Response(JSON.stringify({id_sesion:'s',datos:sesion}),{status:201});};
   await globalThis.__juegoSubmit({preventDefault(){}});assert.deepEqual(body,{activos_juego_id:'a',mesas_id:'m',pedidos_id:'p'});assert.equal(changed,1);assert.equal(cancelled,1);assert.equal(activo.estado,'disponible');
  });
  await t.test('finalizar exige confirmación y reconsulta con costo real',async()=>{
   let calls=0,changed=0;globalThis.__juegoSelected=sesion;
   globalThis.fetch=async(u,o)=>{calls++;assert.equal(o.method,'PUT');return new Response(JSON.stringify({id_sesion:'s',datos:cerrada,total_cobrado:'6000.00'}));};
   assert.match(render(Sessions,{resource:recurso([sesion]),onChanged:async r=>{assert.equal(r.total_cobrado,'6000.00');changed++;}}),/¿Finalizar/);assert.equal(calls,0);
   await globalThis.__juegoConfirmar();assert.equal(calls,1);assert.equal(changed,1);assert.equal(sesion.estado,'activa');
  });
 }finally{globalThis.fetch=old;for(const k of ['__juegoResources','__juegoTab','__juegoSelected','__juegoSubmit','__juegoConfirmar','__juegoChanged','__juegoRefresh'])delete globalThis[k];await server.close();}
});
test('pantallas de juegos sin catálogos ficticios ni permisos de usuarios',()=>{
 for(const path of ['pages/JuegosPage.jsx','components/SesionesJuegosSection.jsx','components/HistorialJuegosSection.jsx','components/MantenimientoJuegosSection.jsx']){
  const s=readFileSync(new URL('../src/'+path,import.meta.url),'utf8');assert.doesNotMatch(s,/JUE-001|SES-001|MAN-001|usuarios\.registrar|Math\.random/);
 }
});
