import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {metodosPago,pagoDivisionBody,registrarPagoDivision,listarPagosDivision,verificarPago,estadoPago} from '../src/services/pagosService.js';
const persona={id:'dp',jugadores_id:'jugador-real',nombre_cliente:'Carlos',asignado:'40000.00',pagado:'10000.00',pendiente_verificacion:'5000.00',saldo:'30000.00',items:[]};
const data={sesion:{id:'d',pedido_id:'p'},modalidad:'total',estado:'activa',desactualizada:false,total_objetivo:'40000.00',total_asignado:'40000.00',total_pagado:'10000.00',total_pendiente:'30000.00',pendiente_verificacion:'5000.00',participantes:[persona]};
const pago={id:'p-persistente',metodo_de_pago:'nequi',total_seleccionado:'5000.00',estado:'pendiente',verificacion_estado:'pendiente',pedidos_id:'p',sesion_division_id:'d',participante_id:'dp',creado_en:'2026-10-14T12:00:00Z'};
test('Pago usa ID del pagador de división, métodos reales, COP y máximo descontando reservas',()=>{
 const body=pagoDivisionBody({valor:'2.844,44',metodo:'nequi'},persona,data,'p','id-estable');
 assert.deepEqual(body,{id:'id-estable',pedidos_id:'p',sesion_division_id:'d',participante_id:'dp',total_seleccionado:'2844.44',metodo_de_pago:'nequi'});
 assert.notEqual(body.participante_id,persona.jugadores_id);
 assert.equal(pagoDivisionBody({valor:'3.500',metodo:'efectivo'},persona,data,'p','id').total_seleccionado,'3500.00');
 assert.deepEqual(Object.keys(metodosPago),['efectivo','nequi','daviplata','tarjeta']);
 for(const valor of ['0','-1','25.001','abc'])assert.throws(()=>pagoDivisionBody({valor,metodo:'efectivo'},persona,data,'p','id'));
 for(const estado of ['cancelada','completada'])assert.throws(()=>pagoDivisionBody({valor:'1',metodo:'nequi'},persona,{...data,estado},'p','id'));
 assert.throws(()=>pagoDivisionBody({valor:'1',metodo:'nequi'},persona,{...data,desactualizada:true},'p','id'));
 assert.throws(()=>pagoDivisionBody({valor:'1',metodo:'bitcoin'},persona,data,'p','id'));
});
test('Recuperación persistente tras respuesta perdida: mismo ID, mismo contenido y sin nuevo pago',async()=>{
 const prev=globalThis.fetch,body={id:pago.id,pedidos_id:'p',sesion_division_id:'d',participante_id:'dp',total_seleccionado:'5000.00',metodo_de_pago:'nequi'},calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,...options});if(options.method==='POST')throw new Error('red después del commit');return new Response(JSON.stringify({datos:[pago]}));};
 try{
  const r=await registrarPagoDivision(body);assert.equal(r.id_pago,pago.id);assert.equal(r.recuperado,true);
  assert.equal(calls.filter(r=>r.method==='POST').length,1);assert.deepEqual(JSON.parse(calls[0].body),body);
  await assert.rejects(()=>registrarPagoDivision({...body,total_seleccionado:'1.00'}),/servidor/);
  assert.equal(calls[0].body,JSON.stringify(body));
 }finally{globalThis.fetch=prev;}
});
test('Listado scoped, verificar/rechazar con contrato actual y estado rechazado legible',async()=>{
 const prev=globalThis.fetch;let request;
 globalThis.fetch=async(url,options)=>{request={url,...options};return new Response(JSON.stringify(options.method==='PATCH'?{id_pago:pago.id,verificacion_estado:JSON.parse(options.body).verificacion_estado}:{datos:[pago]}));};
 try{
  assert.deepEqual(await listarPagosDivision('d'),[pago]);assert.ok(request.url.endsWith('/sesiones-division/d/pagos'));
  for(const decision of ['verificado','rechazado']){await verificarPago(pago.id,decision);assert.equal(request.method,'PATCH');assert.deepEqual(JSON.parse(request.body),{verificacion_estado:decision});}
  assert.equal(estadoPago({...pago,estado:'cancelado',verificacion_estado:'rechazado'}),'Rechazado');
  globalThis.fetch=async()=>new Response(JSON.stringify({datos:[{...pago,sesion_division_id:'otra'}]}));await assert.rejects(()=>listarPagosDivision('d'));
 }finally{globalThis.fetch=prev;}
});
test('Reintento después de error sin pago confirmado conserva exactamente el ID y cuerpo',async()=>{
 const prev=globalThis.fetch,body={id:'p-intento-estable',pedidos_id:'p',sesion_division_id:'d',participante_id:'dp',total_seleccionado:'10.00',metodo_de_pago:'efectivo'},posts=[];let fail=true;
 globalThis.fetch=async(url,options)=>{
  if(options.method==='GET')return new Response(JSON.stringify({datos:[]}));
  posts.push(options.body);if(fail){fail=false;throw new Error('sin respuesta');}
  return new Response(JSON.stringify({id_pago:body.id,estado:'pendiente',verificacion_estado:'pendiente'}),{status:201});
 };
 try{await assert.rejects(()=>registrarPagoDivision(body));await registrarPagoDivision(body);assert.equal(posts.length,2);assert.equal(posts[0],posts[1]);assert.equal(JSON.parse(posts[1]).id,body.id);}finally{globalThis.fetch=prev;}
});
test('UI real de pagos: formulario, historial, permisos, acciones y reconsulta',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'pagos-ui-test',enforce:'pre',transform(source,filename){
  const f=filename.replaceAll('\\','/');
  if(f.endsWith('/hooks/useRemoteCatalog.js'))return source.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) { return globalThis.__pagoResource;');
  if(f.endsWith('/components/PagosDivision.jsx'))return source
   .replace('useState(Boolean(restored))','useState(globalThis.__pagoOpen || Boolean(restored))')
   .replace("useState({valor:'',metodo:'efectivo'})","useState(globalThis.__pagoForm || {valor:'',metodo:'efectivo'})")
   .replace("[error,setError]=useState('')","[error,setError]=useState(globalThis.__pagoError || '')")
   .replace("[success,setSuccess]=useState('')","[success,realSetSuccess]=useState(globalThis.__pagoSuccess || '')")
   .replace('const saldo=disponiblePagador(persona);','const setSuccess=value=>{globalThis.__pagoSuccess=value;realSetSuccess(value);};const saldo=disponiblePagador(persona);')
   .replace('[decision,setDecision]=useState(null)','[decision,setDecision]=useState(globalThis.__pagoDecision || null)')
   .replaceAll('setError(e.message);','globalThis.__pagoError=e.message;setError(e.message);')
   .replace('return <div className="pagos-cliente">','globalThis.__pagoSubmit=submit;globalThis.__pagoDecide=decide;return <div className="pagos-cliente">');
 }}]});
 const previous=globalThis.fetch;
 try{
  const {default:Main,PagoCliente:Cliente}=await server.ssrLoadModule('/src/components/PagosDivision.jsx');const {AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const render=(Component,props,rol='Administrador')=>renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Component,props)));
  const props={persona,data,pedidoId:'p',productosIds:[],pagos:[pago],onChanged:async()=>{}};
  await t.test('acción y formulario muestran saldo máximo y cuatro métodos',()=>{
   assert.match(render(Cliente,props),/Registrar pago/);globalThis.__pagoOpen=true;
   const html=render(Cliente,props);assert.match(html,/Valor/);assert.match(html,/Método de pago/);assert.match(html,/25\.000/);for(const label of Object.values(metodosPago))assert.ok(html.includes(label));
   globalThis.__pagoForm={valor:'25.001',metodo:'efectivo'};assert.match(render(Cliente,props),/supera el saldo/);
   delete globalThis.__pagoForm;delete globalThis.__pagoOpen;
  });
  await t.test('historial compacto distingue pendiente/verificado/rechazado sin UUID principal',()=>{
   const html=render(Cliente,{...props,pagos:[pago,{...pago,id:'p-v',estado:'pagado',verificacion_estado:'verificado'},{...pago,id:'p-r',estado:'cancelado',verificacion_estado:'rechazado'}]});
   for(const word of ['Nequi','Pendiente','Verificado','Rechazado'])assert.ok(html.includes(word));assert.doesNotMatch(html,/p-persistente|jugadores_id|participante_id/);
  });
  await t.test('mesero registra sin verificar; cajero verifica/rechaza; finales y desactualizada bloquean',()=>{
   const mesero=render(Cliente,props,'Mesero');assert.match(mesero,/Registrar pago/);assert.doesNotMatch(mesero,/>Verificar<|>Rechazar</);
   const cajero=render(Cliente,props,'Cajero');assert.match(cajero,/>Verificar</);assert.match(cajero,/>Rechazar</);
   for(const estado of ['cancelada','completada'])assert.doesNotMatch(render(Cliente,{...props,data:{...data,estado}}),/Registrar pago|>Verificar<|>Rechazar</);
   assert.doesNotMatch(render(Cliente,{...props,data:{...data,desactualizada:true}}),/Registrar pago/);
   assert.doesNotMatch(render(Cliente,{...props,pedidoAbierto:false}),/Registrar pago|>Verificar<|>Rechazar</);
   assert.doesNotMatch(render(Cliente,{...props,bloqueado:true}),/Registrar pago/);
   assert.doesNotMatch(render(Cliente,props,'Bartender'),/Registrar pago|>Verificar<|>Rechazar</);
   assert.doesNotMatch(render(Cliente,{...props,data:{...data,modalidad:'items'},persona:{...persona,items:[{pedido_item_id:'de-otro-pedido'}]}}),/Registrar pago<\/button>/);
  });
  await t.test('pago parcial usa IDs reales, reconsulta y reservas actualizadas limitan próximos pagos',async()=>{
   globalThis.__pagoOpen=true;globalThis.__pagoForm={valor:'10.000',metodo:'nequi'};let request,refresh=0;
   globalThis.fetch=async(url,options)=>{request={url,...options};return new Response(JSON.stringify({id_pago:JSON.parse(options.body).id,estado:'pendiente',verificacion_estado:'pendiente'}),{status:201});};
   render(Cliente,{...props,onChanged:async()=>refresh++});await globalThis.__pagoSubmit({preventDefault(){}});
   const body=JSON.parse(request.body);assert.equal(body.participante_id,'dp');assert.equal(body.pedidos_id,'p');assert.equal(body.total_seleccionado,'10000.00');assert.ok(body.id.length<=20);assert.equal(refresh,1);
   assert.equal(globalThis.__pagoSuccess,'Pago registrado. Pendiente de verificación.');
   delete globalThis.__pagoOpen;delete globalThis.__pagoForm;
   assert.doesNotMatch(render(Cliente,{...props,persona:{...persona,pendiente_verificacion:'30000.00'}}),/Registrar pago/);
   assert.match(render(Cliente,{...props,persona:{...persona,pendiente_verificacion:'0.00'},pagos:[{...pago,estado:'cancelado',verificacion_estado:'rechazado'}]}),/Registrar pago/);
   delete globalThis.__pagoSuccess;
  });
  await t.test('verificar y rechazar envían decisiones exactas tras confirmación y reconsultan',async()=>{
   for(const estado of ['verificado','rechazado']){
    let request,refresh=0;globalThis.__pagoDecision={pago,estado};globalThis.fetch=async(url,options)=>{request={url,...options};return new Response(JSON.stringify({id_pago:pago.id,verificacion_estado:estado}));};
    assert.match(render(Cliente,{...props,onChanged:async()=>refresh++}).replaceAll('<!-- -->',''),/¿Verificar|¿Rechazar/);await globalThis.__pagoDecide();assert.deepEqual(JSON.parse(request.body),{verificacion_estado:estado});assert.equal(refresh,1);
   }
   delete globalThis.__pagoDecision;
  });
  await t.test('8E cierre confirmado se muestra despues de reconsultar y bloqueos reales se conservan',async()=>{
   for(const liquidacion of [{cuenta_liquidada:true,division:{estado:'completada'},estado_pedido:'cerrado',estado_mesa:'disponible'},{estado_mesa:'en_cobro',motivo_no_liberacion:'Hay un juego activo.'}]){
    globalThis.__pagoDecision={pago,estado:'verificado'};
    globalThis.fetch=async()=>new Response(JSON.stringify({id_pago:pago.id,verificacion_estado:'verificado',liquidacion}));
    let refreshed=false;
    render(Cliente,{...props,onChanged:async()=>{assert.equal(globalThis.__pagoSuccess,'');refreshed=true;}});
    await globalThis.__pagoDecide();assert.equal(refreshed,true);
    const html=render(Cliente,props);
    for(const text of liquidacion.cuenta_liquidada?['Cuenta pagada','División completada','Pedido cerrado','Mesa disponible']:['Hay un juego activo'])assert.ok(html.includes(text));
   }
   delete globalThis.__pagoDecision;delete globalThis.__pagoSuccess;
  });
  await t.test('error backend visible y lectura con loading/reintento; pagos sin cliente no se ocultan',async()=>{
   globalThis.__pagoDecision={pago,estado:'verificado'};globalThis.fetch=async()=>new Response(JSON.stringify({error:'La cuenta cambió.'}),{status:409});render(Cliente,props);await globalThis.__pagoDecide();assert.match(render(Cliente,props),/La cuenta cambió/);delete globalThis.__pagoError;delete globalThis.__pagoDecision;
   globalThis.__pagoResource={loading:true};assert.match(render(Main,{data,pedidoId:'p',productosIds:[],onChanged:async()=>{}}),/Cargando/);
   globalThis.__pagoResource={error:'Error real de pagos',refresh(){}};assert.match(render(Main,{data,pedidoId:'p',productosIds:[],onChanged:async()=>{}}),/Reintentar/);
   globalThis.__pagoResource={data:[{...pago,participante_id:null}],refresh(){}};assert.match(render(Main,{data,pedidoId:'p',productosIds:[],onChanged:async()=>{}}),/Otros pagos de esta cuenta/);
  });
 }finally{globalThis.fetch=previous;for(const k of ['__pagoResource','__pagoOpen','__pagoForm','__pagoError','__pagoDecision','__pagoSubmit','__pagoDecide','__pagoSuccess'])delete globalThis[k];await server.close();}
});
