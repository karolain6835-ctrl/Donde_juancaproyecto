import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {cambiarEstadoJuego,inicioJuegoBody} from '../src/services/juegosService.js';
const asset={id:'a',nombre:'Billar real',tipo:'billar',estado:'disponible',sesiones_activas:[]};
test('Servicio mantenimiento usa PATCH real, valida estados y conserva errores 409',async()=>{
 const old=globalThis.fetch;
 try{
  const calls=[];globalThis.fetch=async(u,o)=>{calls.push([u,o]);return new Response(JSON.stringify({datos:{...asset,...JSON.parse(o.body)}}));};
  await cambiarEstadoJuego('a','mantenimiento');await cambiarEstadoJuego('a','disponible');
  assert.match(calls[0][0],/\/juegos\/activos\/a\/estado$/);assert.equal(calls[0][1].method,'PATCH');assert.deepEqual(JSON.parse(calls[0][1].body),{estado:'mantenimiento'});
  await assert.rejects(()=>cambiarEstadoJuego('a','ocupado'));assert.equal(calls.length,2);
  assert.throws(()=>inicioJuegoBody({...asset,estado:'mantenimiento'},'m',{id:'p',mesas_id:'m',estado:'abierto'},[{id:'m'}]));
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'Finaliza primero la sesión activa.'}),{status:409});await assert.rejects(()=>cambiarEstadoJuego('a','mantenimiento'),e=>e.status===409);
 }finally{globalThis.fetch=old;}
});
test('Mantenimiento real: tarjetas, permisos, estados remotos y reconsulta tras persistir',async t=>{
 const old=globalThis.fetch;
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'maintenance-test',enforce:'pre',transform(s,f){if(f.replaceAll('\\','/').endsWith('/components/MantenimientoJuegosSection.jsx'))return s.replace(' return <section',' globalThis.__maintenanceChange=cambiar;return <section');}}]});
 try{
  const {default:Component}=await server.ssrLoadModule('/src/components/MantenimientoJuegosSection.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  let refreshes=0;
  const render=(rol='Administrador',data=[asset],extra={})=>renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Component,{resource:{data,loading:false,error:'',refresh:async()=>{},...extra},onChanged:async()=>{refreshes++;}})));
  await t.test('tarjetas reales, mantenimiento, ocupado y permisos',()=>{
   assert.match(render(),/Billar real/);assert.match(render(),/Poner en mantenimiento/);
   assert.match(render('SuperAdmin',[{...asset,estado:'mantenimiento'}]),/Volver a disponible/);
   const html=render('Administrador',[{...asset,estado:'ocupado',sesiones_activas:[{id:'s',mesa_numero:5}]}]);assert.match(html,/disabled/);assert.match(html,/Finaliza primero/);
   for(const role of ['Mesero','Mesera','Cajero'])assert.doesNotMatch(render(role),/Poner en mantenimiento|Volver a disponible/);
  });
  await t.test('vacío, carga y error visibles',()=>{
   assert.match(render('Administrador',[]),/No hay juegos disponibles/);
   assert.match(render('Administrador',[],{loading:true}),/Cargando/);
   assert.match(render('Administrador',[],{error:'Error real'}),/Reintentar/);
  });
  await t.test('espera PATCH antes de reconsultar; error no reconsulta ni muta catálogo',async()=>{
   let pending;globalThis.fetch=()=>new Promise(r=>pending=r);render();
   const task=globalThis.__maintenanceChange(asset);assert.equal(refreshes,0);assert.equal(asset.estado,'disponible');
   pending(new Response(JSON.stringify({datos:{...asset,estado:'mantenimiento'}})));await task;assert.equal(refreshes,1);assert.equal(asset.estado,'disponible');
   globalThis.fetch=async()=>new Response(JSON.stringify({error:'Sesión activa'}),{status:409});render();await globalThis.__maintenanceChange(asset);assert.equal(refreshes,1);
   render('Mesera');await globalThis.__maintenanceChange(asset);assert.equal(refreshes,1);
  });
 }finally{globalThis.fetch=old;delete globalThis.__maintenanceChange;await server.close();}
});
