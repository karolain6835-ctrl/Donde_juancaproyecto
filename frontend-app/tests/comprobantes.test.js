import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {comprobantePedido,generarComprobante} from '../src/services/comprobantesService.js';
const comprobante={id:'c',numero:'42',pedidos_id:'p',cliente_nombre:'Carlos',emitido_en:'2026-10-14T12:00:00Z',total_productos:'3500.50',total_juegos:'1000.00',total_general:'4500.50',total_pagado:'4500.50',items:[{id:'i',tipo:'producto',descripcion:'Poker',cantidad:2,precio_unitario:'1750.25',subtotal:'3500.50'},{id:'j',tipo:'juego',descripcion:'Billar',cantidad:1,precio_unitario:'1000.00',subtotal:'1000.00'}]};
const actual={comprobante,puede_generar:false,motivo:null,mesa_numero:5};
test('comprobantes servicio: consulta, body minimo, duplicado, respuesta perdida y errores reales',async()=>{
 const previous=globalThis.fetch;
 try{
  let calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,...options});return new Response(JSON.stringify(options.method==='POST'?{comprobante}:actual),{status:options.method==='POST'?201:200});};
  assert.equal((await comprobantePedido('p')).comprobante.numero,'42');assert.equal((await generarComprobante('p')).comprobante.id,'c');assert.deepEqual(JSON.parse(calls.find(c=>c.method==='POST').body),{pedido_id:'p'});
  for(const scenario of ['duplicado','red']){globalThis.fetch=async(url,o)=>{if(o.method==='POST'){if(scenario==='red')throw new TypeError('red');return new Response(JSON.stringify({error:'El comprobante ya existe.'}),{status:409});}return new Response(JSON.stringify(actual));};assert.equal((await generarComprobante('p')).comprobante.id,'c');}
  globalThis.fetch=async(url,o)=>new Response(JSON.stringify(o.method==='POST'?{error:'El pedido debe estar cerrado.'}:{comprobante:null,puede_generar:false,motivo:'El pedido debe estar cerrado.'}),{status:o.method==='POST'?409:200});await assert.rejects(()=>generarComprobante('p'),/cerrado/);
  globalThis.fetch=async()=>new Response('{}');await assert.rejects(()=>comprobantePedido('p'));
 }finally{globalThis.fetch=previous;}
});
test('comprobantes UI real: condiciones, vista, generacion, reconsulta, impresion y permisos',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'comprobante-test',enforce:'pre',transform(s,f){
  if(f.replaceAll('\\','/').endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {return globalThis.__comprobanteResource;');
  if(f.replaceAll('\\','/').endsWith('/components/ComprobantePedido.jsx'))return s.replace('function imprimirComprobante(element){','globalThis.__imprimirComprobante=imprimirComprobante;function imprimirComprobante(element){').replace('useState(false)','useState(globalThis.__comprobanteVisible||false)').replace('return <section className="comprobante-seccion">','globalThis.__generarComprobante=generar;return <section className="comprobante-seccion">');
 }}]});
 const previous=globalThis.fetch;
 try{
  const {default:Main}=await server.ssrLoadModule('/src/components/ComprobantePedido.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const render=(data=actual,rol='Cajero',estado='cerrado',resource={})=>{globalThis.__comprobanteResource={data,refresh:async()=>{},...resource};return renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Main,{pedidoId:'p',estado})));};
  await t.test('solo cerrado con permiso; backend decide generar; temporal muestra motivo',()=>{
   assert.match(render(),/Ver comprobante/);assert.match(render({comprobante:null,puede_generar:true}),/Generar comprobante/);
   assert.equal(render(actual,'Cajero','abierto'),'');assert.equal(render(actual,'Mesero'),'');
   const html=render({comprobante:null,puede_generar:false,motivo:'Este pedido no tiene un cliente registrado asociado.'});assert.match(html,/cliente registrado/);assert.doesNotMatch(html,/Generar comprobante/);
  });
  await t.test('datos persistidos, juegos, COP y vista imprimible',()=>{
   globalThis.__comprobanteVisible=true;const html=render();for(const text of ['DONDE JUANCA','42','Carlos','Poker','Billar','Juego','Total','Imprimir'])assert.ok(html.includes(text));assert.match(html,/4\.500,50/);assert.doesNotMatch(html,/Nequi|DIAN/);delete globalThis.__comprobanteVisible;
   const oldWindow=globalThis.window,oldDocument=globalThis.document;let count=0,marked=false;try{globalThis.window={print(){count++;},addEventListener(){}};globalThis.document={querySelectorAll(){return [];},body:{appendChild(){marked=true;}}};globalThis.__imprimirComprobante({cloneNode(){return {classList:{add(){}},remove(){}};}});assert.equal(count,1);assert.equal(marked,true);}finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
  });
  await t.test('generar consulta documento real y refresca; no muta el recurso',async()=>{
   let reads=0,refresh=0;globalThis.fetch=async(url,o)=>{if(o.method==='GET')reads++;return new Response(JSON.stringify(o.method==='POST'?{comprobante}:actual),{status:o.method==='POST'?201:200});};
   const before={comprobante:null,puede_generar:true};render(before,'Administrador','cerrado',{refresh:async()=>refresh++});await globalThis.__generarComprobante();assert.equal(reads,1);assert.equal(refresh,1);assert.equal(before.comprobante,null);
  });
  await t.test('carga error reintento',()=>{assert.match(render(null,'Cajero','cerrado',{loading:true}),/Cargando/);assert.match(render(null,'Cajero','cerrado',{error:'No fue posible cargar el comprobante.'}),/Reintentar/);});
 }finally{globalThis.fetch=previous;for(const key of ['__comprobanteResource','__comprobanteVisible','__generarComprobante','__imprimirComprobante'])delete globalThis[key];await server.close();}
});
