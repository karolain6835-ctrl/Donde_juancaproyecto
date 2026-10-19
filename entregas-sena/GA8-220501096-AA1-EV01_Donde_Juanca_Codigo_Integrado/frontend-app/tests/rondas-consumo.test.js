import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { copiarRonda,baseRonda,rondaBody,listarRondas,obtenerRonda,confirmarRonda } from '../src/services/rondasConsumoService.js';
const round={id:'r1',numero_ronda:1,estado:'confirmada',creada_en:'2026-10-14T12:00:00Z',items:[{id:'historico',participante_id:'a',participante_nombre:'Carlos',productos_id:'pr',producto:'Poker',cantidad_pedida:2,precio_unitario:'100.00',estado:'servido',cantidad_pagada:1}]};
const catalog={productos:[{id:'pr',nombre:'Poker',codigo:'P',activo:true,stock:10,precio:120},{id:'otro',nombre:'Aguila',codigo:'A',activo:true,stock:5,precio:200}],participantes:[{id:'a',nombre:'Carlos',tipo_participante:'temporal'},{id:'b',nombre:'Laura',tipo_participante:'temporal'}],pedidos:[{id:'p',estado:'abierto',sesion_mesa_id:'s'}]};
test('Base de Ronda: consumo suelto o última confirmada; copia aislada sin cancelados',()=>{
 const items=[{participante_id:'a',productos_id:'club',cantidad_pedida:2,estado:'servido',ronda_consumo_id:null},{participante_id:'b',productos_id:'aguila',cantidad_pedida:1,estado:'enviado',ronda_consumo_id:null}];
 assert.deepEqual(baseRonda([],items),[{participante_id:'a',productos_id:'club',cantidad:'2'},{participante_id:'b',productos_id:'aguila',cantidad:'1'}]);
 const last={...round,numero_ronda:2,items:[{...round.items[0],cantidad_pedida:3}]};
 const original=structuredClone(last);
 const draft=baseRonda([last,round,{...last,numero_ronda:3,estado:'cancelada'}],items);
 assert.equal(draft[0].cantidad,'3');draft[0].cantidad='9';assert.deepEqual(last,original);
 assert.deepEqual(baseRonda([],[{...items[0],estado:'cancelado'}]),[]);
 assert.deepEqual(baseRonda([{...last,items:[{...last.items[0],estado:'cancelado'}]}],items),[]);
});
test('Repetir copia únicamente participante/producto/cantidad, con borrador independiente',()=>{
 const before=structuredClone(round),draft=copiarRonda(round);
 assert.deepEqual(draft,[{participante_id:'a',productos_id:'pr',cantidad:'2'}]);
 draft[0].cantidad='3';draft[0].participante_id='b';draft.push({participante_id:'a',productos_id:'otro',cantidad:'1'});
 assert.deepEqual(round,before);assert.deepEqual(copiarRonda({...round,items:[{...round.items[0],estado:'cancelado'}]}),[]);
 const body=rondaBody(draft,catalog);assert.equal(body.items[0].cantidad,3);assert.ok(!Object.hasOwn(body.items[0],'precio_unitario'));
 assert.throws(()=>rondaBody([...draft,{...draft[0],cantidad:9}],catalog),/Stock insuficiente/);
 for(const input of [[],[{...draft[0],cantidad:0}],[{...draft[0],participante_id:'otro-ambito'}]])assert.throws(()=>rondaBody(input,catalog));
});
test('Endpoints de rondas conservan Idempotency-Key, DTO y detalle sin escrituras al listar',async()=>{
 const prev=globalThis.fetch;let request;globalThis.fetch=async(url,options)=>{request={url,...options};return new Response(JSON.stringify({datos:options.method==='POST'||url.endsWith('/r1')?round:[round]}),{status:options.method==='POST'?201:200});};
 try{assert.equal((await listarRondas('p')).length,1);assert.equal(request.method,'GET');assert.ok(request.url.endsWith('/pedidos/p/rondas'));assert.deepEqual(await obtenerRonda('p','r1'),round);
 const body=rondaBody(copiarRonda(round),catalog);await confirmarRonda('p',body,'misma-clave-1');assert.equal(request.headers.get('Idempotency-Key'),'misma-clave-1');assert.deepEqual(JSON.parse(request.body),body);assert.deepEqual(Object.keys(body),['items']);
 }finally{globalThis.fetch=prev;}
});
test('UI real: lista, repetición editable, altas/bajas y confirmación segura',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true},appType:'custom',plugins:[{name:'rondas-ui-test',enforce:'pre',transform(source,filename){
  const f=filename.replaceAll('\\','/');
  if(f.endsWith('/hooks/useRemoteCatalog.js'))return source.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) { return loader.toString().includes("listarClientes") ? { data: { datos: [], total: 0, limite: 20 } } : globalThis.__roundResource;');
  if(f.endsWith('/components/RondasConsumo.jsx'))return source.replace('function Borrador(','export function Borrador(')
   .replace('const [lines,setLines]=useState(()=>inicial || [nuevaLinea()]);','const [lines,realSetLines]=useState(()=>inicial || [nuevaLinea()]);const setLines=next=>{globalThis.__editedRound=next;realSetLines(next);};')
   .replace("[error,setError]=useState('')","[error,setError]=useState(globalThis.__roundError || '')")
   .replace('setError(e.message);','globalThis.__roundError=e.message;setError(e.message);')
   .replace('return <section className="ronda-borrador">','globalThis.__roundConfirm=confirm;globalThis.__roundChange=change;return <section className="ronda-borrador">')
   .replace('onClick={()=>setLines(lines.filter((_,i)=>i!==index))}','onClick={globalThis.__roundRemove=()=>setLines(lines.filter((_,i)=>i!==index))}')
   .replace('onClick={()=>setLines([...lines,nuevaLinea()])}','onClick={globalThis.__roundAdd=()=>setLines([...lines,nuevaLinea()])}');
 }}]});const previous=globalThis.fetch;
 try{
  const {default:Rondas,Borrador}=await server.ssrLoadModule('/src/components/RondasConsumo.jsx');const {AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const render=(Component,props,rol='Mesero')=>renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Component,props)));
  await t.test('lista ronda con personas/productos/fecha y CTA según rol',()=>{
   globalThis.__roundResource={data:[round]};const html=render(Rondas,{pedidoId:'p',sesionId:'s',mesaId:'m',onChanged(){}});assert.match(html,/Ronda <!-- -->1/);assert.match(html,/Carlos/);assert.match(html,/Poker/);assert.ok(html.includes('>Ronda</button>'));assert.doesNotMatch(html,/Repetir ronda|Nueva ronda/);
   assert.doesNotMatch(render(Rondas,{sesionId:'s'},'Cajero'),/Repetir ronda|Nueva ronda/);
   assert.doesNotMatch(render(Rondas,{pedidoId:'p',sesionId:'s',editable:false}),/Repetir ronda|Nueva ronda/);
  });
  await t.test('borrador editable muestra todos los datos, cambia cantidad/persona, agrega y quita',()=>{
   globalThis.fetch=()=>{throw new Error('Un borrador no debe enviar solicitudes.');};
   globalThis.__roundResource={data:catalog,refresh:async()=>{}};let draft=copiarRonda(round);const props={sesionId:'s',mesaId:'m',pedidoId:'p',onConfirmed(){},onCancel(){}};
   const html=render(Borrador,{...props,inicial:draft});assert.match(html,/Ronda/);assert.match(html,/Confirmar ronda/);assert.match(html,/Stock: <!-- -->10/);assert.match(html,/value="a" selected/);
   assert.doesNotMatch(html,/Selecciona un pedido abierto/);
   globalThis.__roundChange(0,'cantidad','3');draft=globalThis.__editedRound;render(Borrador,{...props,inicial:draft});globalThis.__roundChange(0,'participante_id','b');draft=globalThis.__editedRound;assert.equal(draft[0].cantidad,'3');assert.equal(draft[0].participante_id,'b');
   render(Borrador,{...props,inicial:draft});globalThis.__roundAdd();draft=globalThis.__editedRound;assert.equal(draft.length,2);
   render(Borrador,{...props,inicial:draft});globalThis.__roundChange(1,'productos_id','otro');draft=globalThis.__editedRound;assert.equal(draft[1].productos_id,'otro');
   render(Borrador,{...props,inicial:draft});globalThis.__roundRemove();assert.equal(globalThis.__editedRound.length,1);assert.equal(round.items[0].cantidad_pedida,2);
  });
  await t.test('red incierta reintenta mismo cuerpo/clave y reconsulta solo tras confirmación',async()=>{
   globalThis.__roundResource={data:catalog,refresh:async()=>{}};const calls=[];let refreshed=0,first=true;
   globalThis.fetch=async(url,options)=>{calls.push({url,...options});if(first){first=false;throw new Error('red');}if(calls.length===2)return new Response(JSON.stringify({error:'Conflicto concurrente.',codigo:'CONFLICTO_CONCURRENTE'}),{status:409});return new Response(JSON.stringify({datos:round}),{status:200});};
   render(Borrador,{sesionId:'s',mesaId:'m',pedidoId:'p',inicial:copiarRonda(round),onConfirmed:async()=>refreshed++,onCancel(){}});
   const confirm=globalThis.__roundConfirm;await confirm({preventDefault(){}});assert.equal(refreshed,0);await confirm({preventDefault(){}});assert.equal(refreshed,0);await confirm({preventDefault(){}});assert.equal(refreshed,1);
   assert.equal(calls[0].body,calls[1].body);assert.equal(calls[0].headers.get('Idempotency-Key'),calls[1].headers.get('Idempotency-Key'));assert.ok(!JSON.parse(calls[1].body).items[0].estado);
   assert.equal(calls[0].headers.get('Idempotency-Key'),calls[2].headers.get('Idempotency-Key'));assert.equal(calls[0].body,calls[2].body);
  });
  await t.test('error de stock visible conserva borrador sin reconsulta ni éxito optimista',async()=>{
   delete globalThis.__roundError;let refreshed=0;globalThis.fetch=async()=>new Response(JSON.stringify({error:'Stock insuficiente para Poker.'}),{status:400});
   const props={sesionId:'s',mesaId:'m',pedidoId:'p',inicial:copiarRonda(round),onConfirmed:async()=>refreshed++,onCancel(){}};render(Borrador,props);await globalThis.__roundConfirm({preventDefault(){}});assert.equal(refreshed,0);assert.match(render(Borrador,props),/role="alert">Stock insuficiente/);
  });
 }finally{globalThis.fetch=previous;for(const k of ['__roundResource','__roundError','__editedRound','__roundConfirm','__roundChange','__roundRemove','__roundAdd'])delete globalThis[k];await server.close();}
});
