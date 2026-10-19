import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
test('Alertas: presentación compacta sin cambiar paginación compartida, filtros ni permisos',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'alertas-presentation',enforce:'pre',transform(s,f){f=f.replaceAll('\\','/');if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {return globalThis.__alertDetail;');if(f.endsWith('/components/AlertasSection.jsx'))return s.replace('useState(null)','useState(globalThis.__alertSelected||null)');}}]});
 try{
  const {InventoryPagination}=await server.ssrLoadModule('/src/components/InventoryRemoteState.jsx'),{default:Alertas}=await server.ssrLoadModule('/src/components/AlertasSection.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  let query;const resource={data:{datos:[],paginacion:{pagina:2,total:81,total_paginas:5}},query:{estado:'activa',pagina:2},loading:false,refresh:async()=>{},setQuery:q=>{query=q;}};
  await t.test('presentación original intacta y compacta accesible solo si se solicita',()=>{
   const original=renderToString(React.createElement(InventoryPagination,{resource}));assert.match(original,/Página 2 · 81 resultados/);assert.doesNotMatch(original,/Paginación de alertas/);
   const html=renderToString(React.createElement(InventoryPagination,{resource,compact:true}));assert.match(html,/Página 2 de 5/);assert.match(html,/aria-label="Paginación de alertas"/);assert.match(html,/aria-live="polite"/);
   const element=InventoryPagination({resource,compact:true});element.props.children[0].props.onClick();assert.deepEqual(query,{estado:'activa',pagina:1});element.props.children[2].props.onClick();assert.deepEqual(query,{estado:'activa',pagina:3});
  });
  await t.test('límites y carga mantienen disabled; sin metadatos no renderiza',()=>{
   assert.equal(InventoryPagination({resource:{}}),null);
   for(const [pagina,total_paginas,loading,left,right]of [[1,5,false,true,false],[5,5,false,false,true],[2,5,true,true,true],[1,0,false,true,true]]){
    const el=InventoryPagination({resource:{...resource,loading,data:{paginacion:{pagina,total_paginas,total:0}}},compact:true});assert.equal(el.props.children[0].props.disabled,left);assert.equal(el.props.children[2].props.disabled,right);
   }
  });
  const row={id:'alerta1',productos_id:'p1',producto:'Poker 330ml',tipo:'bajo',estado:'activa',stock_actual:6,stock_minimo:6,creado_en:'2026-10-16T12:00:00Z',actualizado_en:'2026-10-16T12:00:00Z',resuelto_en:null,historial:[]};
  const render=(r,rol='Administrador')=>renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Alertas,{resource:r,productos:[{id:'p1',nombre:row.producto,codigo:'CERV-004'}]})));
  await t.test('dos alertas reales conservan detalle, fechas, stocks y código legible',()=>{
   globalThis.__alertDetail={data:null};globalThis.__alertSelected=null;
   const html=render({...resource,data:{...resource.data,datos:[row,{...row,id:'alerta2',productos_id:'p2',producto:'Águila 330ml',tipo:'agotado',estado:'silenciada',stock_actual:0}]}});
   for(const text of ['Poker 330ml','Águila 330ml','CERV-004','Stock actual','Stock mínimo','Stock bajo','Agotado','Activa','Silenciada','Página 2 de 5'])assert.ok(html.includes(text),text);
   assert.equal((html.match(/Ver detalle/g)||[]).length,2);assert.doesNotMatch(html,/>alerta1</);
  });
  await t.test('acciones del detalle respetan los permisos; estados remotos visibles',()=>{
   globalThis.__alertSelected=row.id;globalThis.__alertDetail={data:row};
   const r={...resource,data:{...resource.data,datos:[row]}};assert.match(render(r),/Marcar como vista|Silenciar|Resolver/);assert.doesNotMatch(render(r,'Cajero'),/>Silenciar<|>Resolver<|>Marcar como vista</);
   globalThis.__alertSelected=null;assert.match(render({...r,loading:true}),/Cargando/);assert.match(render({...r,error:'Error real de alertas'}),/Reintentar/);assert.match(render({...resource,data:{...resource.data,datos:[]}}),/No hay alertas para mostrar/);
  });
 }finally{delete globalThis.__alertDetail;delete globalThis.__alertSelected;await server.close();}
});
