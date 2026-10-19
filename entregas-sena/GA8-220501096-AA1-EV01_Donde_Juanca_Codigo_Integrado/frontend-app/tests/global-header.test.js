import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { searchDestinations, globalDestinations } from '../src/utils/globalNavigation.js';

const admin={id:'admin',rol:'Administrador'};
test('Búsqueda: mayúsculas, tildes, vacíos y permisos de destinos reales',()=>{
 assert.equal(searchDestinations(' AUDITORIA ',admin)[0].section,'auditoria');
 assert.equal(searchDestinations('configuración',admin)[0].section,'configuracion');
 assert.equal(searchDestinations('PRODUCTOS',admin)[0].section,'productos');
 assert.deepEqual(searchDestinations('sin coincidencias',admin),[]);
 assert.deepEqual(searchDestinations('',admin),[]);
 assert.deepEqual(searchDestinations('usuarios',{rol:'Mesera'}),[]);
 assert.deepEqual(searchDestinations('alertas',{rol:'Cajero'}),[]);
 assert.equal(searchDestinations('perfil',{rol:'Cajero'})[0].section,'perfil');
 assert.deepEqual(searchDestinations('perfil',null),[]);
 const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 for(const item of globalDestinations)if(item.path)assert.ok(app.includes('path="'+item.path+'"'),item.path);
});

test('Cabecera real: resultados, navegación, alertas, vacío, error, permisos y recarga',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'header-test',enforce:'pre',transform(source,file){
  if(!file.replaceAll('\\','/').endsWith('/components/GlobalHeaderTools.jsx'))return;
  return source.replace("import { useNavigate } from 'react-router-dom';","const useNavigate=()=>globalThis.__headerNavigate;")
   .replace("import { useRemoteCatalog } from '../hooks/useRemoteCatalog';","const useRemoteCatalog=loader=>{globalThis.__headerLoader=loader;return globalThis.__headerResource;};")
   .replace("[query,setQuery]=useState('')","[query,setQuery]=useState(globalThis.__headerQuery||'')")
   .replace('[searchOpen,setSearchOpen]=useState(false)','[searchOpen,setSearchOpen]=useState(true)')
   .replace('[notificationsOpen,setNotificationsOpen]=useState(false)','[notificationsOpen,setNotificationsOpen]=useState(globalThis.__headerNotificationsOpen??true)')
   .replace(' return <div className="global-header-tools"',' globalThis.__headerOpen=openDestination;globalThis.__headerKey=searchKey;globalThis.__headerToggle=toggleNotifications; return <div className="global-header-tools"');
 }}]});
 const oldFetch=globalThis.fetch;
 try{
  const {default:Tools}=await server.ssrLoadModule('/src/components/GlobalHeaderTools.jsx');
  const {AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const navigation=[];globalThis.__headerNavigate=(...args)=>navigation.push(args);
  globalThis.__headerResource={data:{datos:[],paginacion:{total:0}},loading:false,error:'',refresh:async()=>{}};
  const render=(user=admin)=>renderToString(React.createElement(MemoryRouter,null,React.createElement(AuthContext.Provider,{value:{user}},React.createElement(Tools))));
  await t.test('resultados y navegación seleccionan pestaña real',()=>{
   globalThis.__headerQuery='productos';assert.match(render(),/>Productos<\/button>/);
   globalThis.__headerOpen(searchDestinations('productos',admin)[0]);
   assert.deepEqual(navigation.pop(),['/inventario',{state:{headerSection:'productos'}}]);
   let prevented=false;globalThis.__headerKey({key:'Enter',preventDefault(){prevented=true;}});
   assert.equal(prevented,true);assert.equal(navigation.pop()[0],'/inventario');
   globalThis.__headerQuery='ninguno';assert.match(render(),/No encontramos módulos/);
   globalThis.__headerKey({key:'Enter'});assert.equal(navigation.length,0);
  });
  await t.test('sin alertas no hay indicador estático',()=>{
   const html=render();assert.match(html,/No hay alertas pendientes/);assert.doesNotMatch(html,/header-notification-count|notification-dot/);
  });
  await t.test('lista y cantidad vienen del backend, no del tamaño de página',()=>{
   globalThis.__headerResource.data={datos:[{id:'a',producto:'Producto real',tipo:'bajo',stock_actual:2,stock_minimo:6}],paginacion:{total:23}};
   const html=render();assert.match(html,/23 alertas activas/);assert.match(html,/Producto real/);assert.match(html.replaceAll(/<!--.*?-->/g,''),/Stock: 2/);
   globalThis.__headerOpen({path:'/inventario',section:'alertas'});assert.equal(navigation.pop()[1].state.headerSection,'alertas');
  });
  await t.test('loading y error con reintento sin contador obsoleto',()=>{
   globalThis.__headerResource.loading=true;assert.match(render(),/Cargando alertas/);
   globalThis.__headerResource.loading=false;globalThis.__headerResource.error='Error real';const html=render();assert.match(html,/Reintentar/);assert.doesNotMatch(html,/header-notification-count/);
  });
  await t.test('carga usa servicio existente con filtro activa y señal; roles sin acceso no consultan',async()=>{
   let calls=0;globalThis.fetch=async url=>{calls++;assert.match(url,/inventario\/alertas\?/);assert.match(url,/estado=activa/);return new Response(JSON.stringify({alertas:[],total_alertas:0,paginacion:{pagina:1,total:0,total_paginas:0}}));};
   render();await globalThis.__headerLoader({signal:new AbortController().signal});assert.equal(calls,1);
   assert.doesNotMatch(render({id:'c',rol:'Cajero'}),/Notificaciones|Alertas de inventario/);
   assert.equal(await globalThis.__headerLoader({}),null);assert.equal(calls,1);
  });
  await t.test('abrir campana reconsulta; cerrar no dispara otra petición',()=>{
   let refreshes=0;globalThis.__headerResource.refresh=()=>{refreshes++;};
   globalThis.__headerNotificationsOpen=false;render();globalThis.__headerToggle();assert.equal(refreshes,1);
   globalThis.__headerNotificationsOpen=true;render();globalThis.__headerToggle();assert.equal(refreshes,1);
  });
 }finally{globalThis.fetch=oldFetch;for(const key of Object.keys(globalThis))if(key.startsWith('__header'))delete globalThis[key];await server.close();}
});
