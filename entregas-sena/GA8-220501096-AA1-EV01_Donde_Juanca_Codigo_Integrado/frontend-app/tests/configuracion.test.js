import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {can} from '../src/utils/permissions.js';
test('Configuracion real: carga, permisos, edicion, PUT y reconsulta; errores sin exito falso',async t=>{
 const old=globalThis.fetch;
 const values={nombreNegocio:'Nombre real API',nit:'',telefono:'',email:'',direccion:'',horaApertura:'',horaCierre:'',impuesto:'',moneda:'COP'};
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'config-test',enforce:'pre',transform(s,f){if(!f.replaceAll('\\','/').endsWith('/components/ConfiguracionSection.jsx'))return;
 return s.replace('useState({...configuracionVacia})','useState(globalThis.__configValues||{...configuracionVacia})').replace('useState(null)','useState(globalThis.__configPersisted??null)').replace('useState(true)','useState(globalThis.__configLoading??false)').replace("useState('')","useState(globalThis.__configError||'')").replace('  if(!permitido)return <p>','  globalThis.__configSave=confirmarGuardado;globalThis.__configEdit=actualizarCampo; if(!permitido)return <p>');
 }}]});
 try{
  const {default:Main}=await server.ssrLoadModule('/src/components/ConfiguracionSection.jsx');const {AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');const service=await server.ssrLoadModule('/src/services/configuracionService.js');
  const render=(rol='Administrador')=>renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Main)));
  await t.test('loading, error reintentar y permisos sin contactos simulados',()=>{
   globalThis.__configLoading=true;assert.match(render(),/Cargando configuración/);globalThis.__configLoading=false;globalThis.__configError='Error real';assert.match(render(),/Reintentar/);assert.doesNotMatch(render(),/900123456|300 555|contacto@/);
   for(const rol of ['Mesero','Mesera','Bartender','Cajero']){assert.equal(can({rol},'configuracion.ver'),false);assert.match(render(rol),/No tienes permiso/);}for(const rol of ['Administrador','SuperAdmin'])assert.equal(can({rol},'configuracion.editar'),true);
  });
  await t.test('carga API y formulario distingue editado de persistido',async()=>{
   globalThis.fetch=async()=>new Response(JSON.stringify({configuracion:values}));assert.deepEqual(await service.consultarConfiguracion(),values);
   globalThis.__configPersisted=values;globalThis.__configValues={...values,nombreNegocio:'Editado'};globalThis.__configError='';const html=render();assert.match(html,/Editado/);assert.match(html,/Hay cambios sin guardar/);assert.doesNotMatch(html,/Cambios guardados/);
  });
  await t.test('guardar llama PUT luego GET, reconsulta autoridad y no incluye actor',async()=>{
   const calls=[];globalThis.fetch=async(u,o)=>{calls.push(o.method);if(o.method==='PUT'){assert.deepEqual(JSON.parse(o.body),globalThis.__configValues);return new Response(JSON.stringify({mensaje:'ok'}));}return new Response(JSON.stringify({configuracion:values}));};
   assert.deepEqual(await service.guardarConfiguracion(globalThis.__configValues),values);assert.deepEqual(calls,['PUT','GET']);calls.length=0;render();await globalThis.__configSave();assert.deepEqual(calls,['PUT','GET']);
  });
  await t.test('error de guardado no reconsulta ni finge exito',async()=>{
   let n=0;globalThis.fetch=async()=>{n++;return new Response(JSON.stringify({error:'Correo inválido'}),{status:400});};await assert.rejects(()=>service.guardarConfiguracion(values),/Correo inválido/);assert.equal(n,1);
  });
 }finally{globalThis.fetch=old;for(const k of Object.keys(globalThis))if(k.startsWith('__config'))delete globalThis[k];await server.close();}
});
