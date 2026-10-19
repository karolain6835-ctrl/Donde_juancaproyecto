import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {pagoDirectoBody,registrarPagoDirecto,tieneDivisionActivaPedido} from '../src/services/pagosService.js';
const contexto={pedido:{id:'p',estado:'abierto'},saldo:'50000.00',pendiente_verificacion:'0.00',divisiones:[]};
test('V1-1 bloqueo usa relacion con pedido o criterio backend, no visita compartida',()=>{
 for(const d of [{estado:'activa',pedido_id:'otro'},{estado:'activa',pedido_id:null},{estado:'completada',pedido_id:'p'},{estado:'cancelada',pedido_id:'p'}]){
  const ctx={...contexto,divisiones:[d]};assert.equal(tieneDivisionActivaPedido(ctx),false);assert.equal(pagoDirectoBody({valor:'5.000',metodo:'efectivo'},ctx,'id').total_seleccionado,'5000.00');
 }
 assert.equal(tieneDivisionActivaPedido({...contexto,tiene_division_activa:true,divisiones:[{estado:'activa',pedido_id:null}]}),true);
 assert.throws(()=>pagoDirectoBody({valor:'5.000',metodo:'efectivo'},{...contexto,tiene_division_activa:true},'id'),/división activa/);
});
test('pago directo total/parcial COP, reservas, sobrepago, saldo cero y division activa',()=>{
 for(const [valor,expected]of [['50.000','50000.00'],['2.844,44','2844.44']]){
  const b=pagoDirectoBody({valor,metodo:'nequi'},contexto,'intento');assert.equal(b.total_seleccionado,expected);assert.equal(b.pedidos_id,'p');assert.equal(Object.hasOwn(b,'sesion_division_id'),false);assert.equal(Object.hasOwn(b,'participante_id'),false);
 }
 for(const [ctx,valor]of [[contexto,'50.001'],[{...contexto,pendiente_verificacion:'40000.00'},'10.001'],[{...contexto,saldo:'0.00'},'1'],[{...contexto,divisiones:[{estado:'activa',pedido_id:'p'}]},'1']])assert.throws(()=>pagoDirectoBody({valor,metodo:'efectivo'},ctx,'id'));
});
test('POST directo no incluye division',async()=>{
 const old=globalThis.fetch;try{let body;globalThis.fetch=async(url,o)=>{assert.match(url,/\/pagos$/);body=JSON.parse(o.body);return new Response(JSON.stringify({id_pago:body.id}),{status:201});};const b=pagoDirectoBody({valor:'50.000',metodo:'efectivo'},contexto,'id');await registrarPagoDirecto(b);assert.deepEqual(body,b);await assert.rejects(()=>registrarPagoDirecto({...b,sesion_division_id:'d'}));}finally{globalThis.fetch=old;}
});
test('UI pago directo real: botones, permisos, saldo, formulario y reconsulta',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'directo-test',enforce:'pre',transform(s,f){
  f=f.replaceAll('\\','/');
  if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {return globalThis.__directResource;');
  if(f.endsWith('/components/PagoDirectoPedido.jsx'))return s.replace('useState(false),[form','useState(true),[form').replace("useState({valor:'',metodo:'efectivo'})","useState(globalThis.__directForm||{valor:'',metodo:'efectivo'})").replace('return <section className="pago-directo">','globalThis.__directSubmit=submit;return <section className="pago-directo">');
 }}]});
 const old=globalThis.fetch;
 try{
  const {default:Main}=await server.ssrLoadModule('/src/components/PagoDirectoPedido.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');let reads=0,changed=0;
  const render=(data=contexto,rol='Mesera')=>{globalThis.__directResource={data,refresh:async()=>reads++};return renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Main,{pedidoId:'p',onDivision(){},onChanged:async()=>changed++})));};
  await t.test('sin division saldo 50000 Pagar principal y Dividir secundaria; total y parcial',async()=>{
   for(const valor of ['50.000','20.000']){globalThis.__directForm={valor,metodo:'nequi'};const html=render();assert.match(html,/>Pagar</);assert.match(html,/Dividir cuenta/);assert.match(html,/Saldo pendiente/);let body;globalThis.fetch=async(u,o)=>{body=JSON.parse(o.body);return new Response(JSON.stringify({id_pago:body.id}),{status:201});};await globalThis.__directSubmit({preventDefault(){}});assert.equal(body.total_seleccionado,valor==='50.000'?'50000.00':'20000.00');assert.equal(Object.hasOwn(body,'participante_id'),false);assert.equal(Object.hasOwn(body,'sesion_division_id'),false);assert.equal(contexto.saldo,'50000.00');}
   assert.equal(reads,2);assert.equal(changed,2);
  });
  await t.test('saldo cero permisos reservas y division activa',()=>{
   assert.doesNotMatch(render({...contexto,saldo:'0.00'}),/>Pagar</);assert.doesNotMatch(render(contexto,'Bartender'),/>Pagar</);
   const active=render({...contexto,divisiones:[{estado:'activa',pedido_id:'p'}]});assert.match(active,/Ver división/);assert.match(active,/disabled="">Pagar/);assert.match(active,/Registra los pagos desde la división/);assert.doesNotMatch(active,/Pagar pedido/);
   const reserved=render({...contexto,pendiente_verificacion:'20000.00'});assert.match(reserved,/Disponible para pagar/);assert.match(reserved,/30\.000/);
   globalThis.__directForm={valor:'50.001',metodo:'efectivo'};assert.match(render(),/supera el saldo/);
  });
  await t.test('V1-1 division ajena y vacia dejan Pagar habilitado; asignaciones propias bloquean',()=>{
   for(const d of [{estado:'activa',pedido_id:'otro'},{estado:'activa',pedido_id:null},{estado:'completada',pedido_id:'p'},{estado:'cancelada',pedido_id:'p'}]){
    const html=render({...contexto,tiene_division_activa:false,divisiones:[d]});assert.match(html,/<button class="drawer-primary-button">Pagar/);assert.doesNotMatch(html,/Esta cuenta tiene una división activa/);
   }
   const html=render({...contexto,tiene_division_activa:true,divisiones:[{estado:'activa',pedido_id:null}]});assert.match(html,/disabled="">Pagar/);assert.match(html,/Esta cuenta tiene una división activa. Registra los pagos desde la división./);
  });
 }finally{globalThis.fetch=old;for(const key of ['__directResource','__directForm','__directSubmit'])delete globalThis[key];await server.close();}
});
