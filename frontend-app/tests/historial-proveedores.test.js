import test from 'node:test';import assert from 'node:assert/strict';
import React from 'react';import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';import {fileURLToPath} from 'node:url';
import {listarCompras,detalleCompra} from '../src/services/comprasService.js';
const proveedor={id:'s',nombre:'Proveedor real',contacto_nombre:'Proveedor real',estado:'activo',email:null,telefono:null};
const compra={id:'purchase',proveedores_id:'s',estado:'pendiente',modelo_recepcion:'v2',total_estimado:'5688.88',total_recibido:'0.00',creado_en:'2026-10-16T18:00:00Z',items:[{id:'i',producto_nombre:'Producto real',cantidad:2,precio_unitario:'2844.44',subtotal:'5688.88'}]};
const page={datos:[compra],paginacion:{pagina:1,limite:20,total:21,total_paginas:2}};
const resource=data=>({data,loading:false,error:'',refresh:async()=>{}});
test('Servicios existentes usan filtro real de proveedor, página y detalle sin cambiar COP',async()=>{
 const old=globalThis.fetch;
 try{const calls=[];globalThis.fetch=async(u,o)=>{calls.push([u,o]);return new Response(JSON.stringify(u.includes('?')?page:{datos:compra}));};
  assert.equal((await listarCompras({proveedores_id:'s',pagina:2})).datos[0].total_estimado,'5688.88');assert.match(calls[0][0],/proveedores_id=s/);assert.match(calls[0][0],/pagina=2/);assert.equal(calls[0][1].method,'GET');
  assert.equal((await detalleCompra('purchase')).items[0].precio_unitario,'2844.44');assert.match(calls[1][0],/\/compras\/purchase$/);
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'Proveedor no encontrado.'}),{status:404});await assert.rejects(()=>listarCompras({proveedores_id:'missing'}),e=>e.status===404);
 }finally{globalThis.fetch=old;}
});
test('Historial proveedor real: estados, COP, permisos, detalle y filtro backend',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'supplier-history-test',enforce:'pre',transform(s,f){f=f.replaceAll('\\','/');
  if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {globalThis.__supplierLoaders.push(loader);return globalThis.__supplierResources.shift();');
  if(f.endsWith('/components/HistorialComprasProveedor.jsx'))return s.replace('[selected,setSelected]=useState(null)','[selected,setSelected]=useState(globalThis.__supplierSelected??null)');
  if(f.endsWith('/components/ProveedoresSection.jsx'))return s.replace('[selected, setSelected] = useState(null)','[selected, setSelected] = useState(globalThis.__supplierProvider??null)');
 }}]});
 const old=globalThis.fetch;
 try{
  const {default:History}=await server.ssrLoadModule('/src/components/HistorialComprasProveedor.jsx'),{default:Providers}=await server.ssrLoadModule('/src/components/ProveedoresSection.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const render=(rol='Administrador',history=resource(page),detail=resource({datos:[compra]}))=>{globalThis.__supplierLoaders=[];globalThis.__supplierResources=[history,detail];return renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(History,{proveedor,onClose(){}})));};
  await t.test('datos, estados, página y detalle muestran importes reales',()=>{
   globalThis.__supplierSelected='purchase';const html=render();assert.match(html,/Proveedor real/);assert.match(html,/5\.688,88/);assert.match(html,/2\.844,44/);assert.match(html,/Producto real/);assert.match(html,/Pendiente/);assert.match(html,/21 resultados/);assert.match(html,/Volver al proveedor/);
  });
  await t.test('vacío, cargando, error y reintento',async()=>{
   globalThis.__supplierSelected=null;assert.match(render('Administrador',resource({...page,datos:[]})),/aún no tiene compras/);
   assert.match(render('Administrador',{...resource(page),loading:true}),/Cargando/);
   let retries=0;const failed={...resource(page),error:'Error real',refresh:async()=>{retries++;}};assert.match(render('Administrador',failed),/Reintentar/);await failed.refresh();assert.equal(retries,1);
  });
  await t.test('listado filtrado y detalle solo seleccionado; rechaza compra ajena',async()=>{
   const calls=[];globalThis.fetch=async u=>{calls.push(u);return new Response(JSON.stringify(u.includes('?')?page:{datos:compra}));};
   render();await globalThis.__supplierLoaders[0]({});assert.match(calls[0],/proveedores_id=s/);await globalThis.__supplierLoaders[1]({});assert.equal(calls.length,1);
   globalThis.__supplierSelected='purchase';render();await globalThis.__supplierLoaders[1]({});assert.equal(calls.length,2);
   globalThis.fetch=async()=>new Response(JSON.stringify({datos:{...compra,proveedores_id:'other'}}));await assert.rejects(()=>globalThis.__supplierLoaders[1]({}),/no pertenece/);
  });
  await t.test('roles no administrativos no consultan; acción real desde proveedor',async()=>{
   for(const role of ['Mesera','Cajero','Bartender']){assert.match(render(role),/No tienes permiso/);assert.deepEqual(await globalThis.__supplierLoaders[0]({}),{datos:[]});}
   globalThis.__supplierProvider=proveedor;globalThis.__supplierResources=[resource([proveedor])];globalThis.__supplierLoaders=[];
   const html=renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol:'Administrador'}}},React.createElement(Providers)));assert.match(html,/Ver historial de compras/);assert.doesNotMatch(html,/historial de compras no está disponible/);
  });
 }finally{globalThis.fetch=old;for(const k of Object.keys(globalThis))if(k.startsWith('__supplier'))delete globalThis[k];await server.close();}
});
