import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {historialCliente} from '../src/services/clientesService.js';
const cliente={id:'c',nombre:'Carlos',estado:'activo',email:null,telefono:null};
const row={id:'p',fecha:'2026-10-16T18:00:00Z',mesa:5,estado:'cerrado',cliente_del_pedido:false,participa:true,sesion_mesa_id:'v',total_pedido:'5000.00',consumo_cliente:'2844.44',pagos_atribuidos:'1000.00',total_definitivo:true};
const payload={cliente,datos:[row],paginacion:{pagina:1,limite:20,total:21,total_paginas:2}};
test('Historial service consume endpoint paginado y conserva COP decimal y errores',async()=>{
 const old=globalThis.fetch;
 try{
  const calls=[];globalThis.fetch=async(u,o)=>{calls.push([u,o]);return new Response(JSON.stringify(payload));};
  assert.equal((await historialCliente('c',{pagina:2})).datos[0].consumo_cliente,'2844.44');
  assert.match(calls[0][0],/\/clientes\/c\/historial\?pagina=2&limite=20$/);assert.equal(calls[0][1].method,'GET');
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'Cliente inexistente.'}),{status:404});await assert.rejects(()=>historialCliente('c'),e=>e.status===404);
  globalThis.fetch=async()=>new Response(JSON.stringify({...payload,datos:[{...row,total_pedido:'mal'}]}));await assert.rejects(()=>historialCliente('c'));
 }finally{globalThis.fetch=old;}
});
test('Historial real: selección, COP, carga, vacío, error, paginación y permisos',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'history-test',enforce:'pre',transform(s,f){
  f=f.replaceAll('\\','/');
  if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {globalThis.__historyLoader=loader;return globalThis.__historyResource;');
  if(f.endsWith('/pages/ClientesPage.jsx'))return s.replace('[clienteSeleccionado, setClienteSeleccionado] = useState(null)','[clienteSeleccionado, setClienteSeleccionado] = useState(globalThis.__historySelected||null)');
 }}]});
 const old=globalThis.fetch;
 try{
  const {default:Section}=await server.ssrLoadModule('/src/components/HistorialClientesSection.jsx'),{default:Page}=await server.ssrLoadModule('/src/pages/ClientesPage.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  let refreshed=0;const resource={data:payload,loading:false,error:'',refresh:async()=>{refreshed++;}};
  const render=(props={cliente},rol='Mesera')=>renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Section,props)));
  await t.test('dinero personal separado del total, COP exacto y páginas reales',()=>{
   globalThis.__historyResource=resource;const html=render();assert.match(html,/Historial de/);assert.match(html,/2\.844,44/);assert.match(html,/5\.000,00/);assert.match(html,/Pagos verificados del cliente/);assert.match(html,/Cliente en la visita/);assert.match(html,/21 resultados/);assert.match(html,/Siguiente/);assert.doesNotMatch(html,/no disponible/);
  });
  await t.test('selección requerida, vacío, loading, error y reintento',async()=>{
   assert.match(render({}),/Selecciona un cliente/);
   globalThis.__historyResource={...resource,data:{...payload,datos:[],paginacion:{...payload.paginacion,total:0,total_paginas:0}}};assert.match(render(),/aún no tiene historial/);
   globalThis.__historyResource={...resource,loading:true};assert.match(render(),/Cargando/);
   globalThis.__historyResource={...resource,error:'Error real'};assert.match(render(),/Reintentar/);await globalThis.__historyResource.refresh();assert.equal(refreshed,1);
  });
  await t.test('rol no autorizado no consulta; rol válido usa API con paginación',async()=>{
   globalThis.__historyResource=resource;assert.match(render({cliente},'Bartender'),/No tienes permiso/);assert.deepEqual(await globalThis.__historyLoader({}),{datos:[]});
   let calls=0;globalThis.fetch=async url=>{calls++;assert.match(url,/historial\?pagina=1/);return new Response(JSON.stringify(payload));};render();await globalThis.__historyLoader({});assert.equal(calls,1);
  });
  await t.test('detalle real del cliente ofrece acción de historial',()=>{
   globalThis.__historySelected=cliente;globalThis.__historyResource={...resource,data:{datos:[cliente],total:1,limite:20}};
   const html=renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol:'Administrador'}}},React.createElement(Page)));assert.match(html,/Ver historial/);
  });
 }finally{globalThis.fetch=old;for(const k of Object.keys(globalThis))if(k.startsWith('__history'))delete globalThis[k];await server.close();}
});
