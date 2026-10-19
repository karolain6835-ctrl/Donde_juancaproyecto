import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {listarPagosGlobal} from '../src/services/pagosService.js';
test('servicio global envia filtros reales y valida contrato',async()=>{
 const old=globalThis.fetch;try{let url;globalThis.fetch=async u=>{url=u;return new Response(JSON.stringify({datos:[],resumen:{},paginacion:{}}));};await listarPagosGlobal({estado:'pendiente',pagina:2,desde:'2026-10-14'});assert.match(url,/estado=pendiente/);assert.match(url,/pagina=2/);globalThis.fetch=async()=>new Response('{}');await assert.rejects(()=>listarPagosGlobal());}finally{globalThis.fetch=old;}
});
test('Caja real: indicadores, listado, detalle, permisos, filtros, acciones y estados remotos',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'global-test',enforce:'pre',transform(s,f){
  if(f.replaceAll('\\','/').endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {return globalThis.__resources.shift();');
  if(f.replaceAll('\\','/').endsWith('/components/PagosGlobal.jsx'))return s.replace('[selected,setSelected]=useState(null)','[selected,setSelected]=useState(globalThis.__selected||null)').replace('[decision,setDecision]=useState(null)','[decision,setDecision]=useState(globalThis.__decision||null)').replace('return <section className="pagos-global">','globalThis.__confirmar=confirmar;globalThis.__cambiar=cambiar;return <section className="pagos-global">');
 }}]});
 const old=globalThis.fetch;
 try{
  const {default:Main}=await server.ssrLoadModule('/src/components/PagosGlobal.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const pago={id:'a',estado:'pendiente',verificacion_estado:'pendiente',metodo_de_pago:'nequi',total_seleccionado:'3500.50',cliente_nombre:'Carlos',registrado_por:'Ana',mesa_numero:5,pedidos_id:'p',creado_en:'2026-10-14T12:00:00Z'};
  const data={datos:[pago],resumen:{verificados:2,pendientes:1,rechazados:3,total_verificado:'7000.50'},paginacion:{total:30,totalPaginas:2}};
  let refresh=0;const render=(resource={data,refresh:async()=>refresh++},rol='Cajero')=>{globalThis.__resources=[resource,{data:[{id:'m',numero:5}],refresh(){}}];return renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Main)));};
  await t.test('datos reales, COP, fechas, filtros y paginacion',()=>{const html=render();for(const text of ['Carlos','Ana','Mesa 5','Nequi','Pagos verificados','Total verificado','Desde','Hasta','Siguiente','Pendiente'])assert.ok(html.includes(text));assert.match(html,/3\.500,50/);assert.doesNotMatch(html,/PG-901|Saldo inicial|Saldo esperado/);});
  await t.test('detalle y verificar/rechazar reconsultan sin mutar la fuente',async()=>{globalThis.__selected='a';for(const decision of ['verificado','rechazado']){globalThis.__decision=decision;let body;globalThis.fetch=async(u,o)=>{body=JSON.parse(o.body);return new Response(JSON.stringify({id_pago:'a',verificacion_estado:decision}));};assert.match(render(),/Detalle del pago/);await globalThis.__confirmar();assert.equal(body.verificacion_estado,decision);assert.equal(data.datos[0].verificacion_estado,'pendiente');}assert.equal(refresh,2);delete globalThis.__decision;delete globalThis.__selected;});
  await t.test('loading error reintento vacio permisos y estados traducidos',()=>{assert.match(render({loading:true}),/Cargando/);assert.match(render({error:'Fallo real',refresh(){}}),/Fallo real|Reintentar/);assert.match(render({data:{...data,datos:[]}}),/No hay pagos para mostrar/);assert.match(render(undefined,'Mesero'),/No tienes permiso/);for(const estado of ['verificado','rechazado'])assert.ok(render({data:{...data,datos:[{...pago,verificacion_estado:estado,estado:estado==='verificado'?'pagado':'cancelado'}]}}).includes(estado[0].toUpperCase()+estado.slice(1)));});
 }finally{globalThis.fetch=old;for(const key of ['__resources','__selected','__decision','__confirmar','__cambiar'])delete globalThis[key];await server.close();}
});
