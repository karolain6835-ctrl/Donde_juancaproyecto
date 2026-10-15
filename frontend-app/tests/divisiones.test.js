import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {planDivision,estimarIguales,montoCOP,centavosDivision,disponiblePagador,crearDivision,asignarProductosDivision,definirCuotasDivision,obtenerDivision,finalizarDivision,contextoDivision,ejecutarDivision} from '../src/services/divisionesService.js';
const clientes=[{id:'a',nombre:'Carlos',tipo_participante:'registrado'},{id:'b',nombre:'Laura',tipo_participante:'temporal'}];
const contexto={pedido:{id:'p',mesas_id:'m',mesa_numero:5,sesion_mesa_id:'s',estado:'abierto',estado_visita:'activa'},saldo:'90000.00',pendiente_verificacion:'0.00',total_definitivo:true,divisiones:[],items:[{id:'i',productos_id:'pr',nombre:'Poker',codigo:'CERV-005',cantidad_pedida:4,cantidad_disponible:4,precio_unitario:'3500.00',cliente_nombre:'Laura'}]};
const form={productos:{},cliente:'',clientes:[],cuotas:[]};
const summary={sesion:{id:'d',modalidad:'personalizada'},modalidad:'personalizada',estado:'activa',total_objetivo:'90000.00',total_asignado:'90000.00',total_pagado:'20000.00',total_pendiente:'70000.00',pendiente_verificacion:'10000.00',total_definitivo:true,desactualizada:false,pagos_sin_cuota:false,participantes:[{id:'dp',jugadores_id:'a',nombre_cliente:'Carlos',asignado:'40000.00',pagado:'20000.00',pendiente_verificacion:'10000.00',saldo:'20000.00'}]};
test('Productos: cantidades parciales, cliente distinto del consumidor y sin precio manual',()=>{
 const result=planDivision('items',{...form,productos:{i:{a:'2',b:'1'}}},contexto,clientes);
 assert.deepEqual(result,[{jugadores_id:'a',items:[{pedido_item_id:'i',cantidad:2}]},{jugadores_id:'b',items:[{pedido_item_id:'i',cantidad:1}]}]);
 assert.throws(()=>planDivision('items',{...form,productos:{i:{a:'3',b:'2'}}},contexto,clientes),/disponibles/);
 for(const n of ['-1','1.5','abc'])assert.throws(()=>planDivision('items',{...form,productos:{i:{a:n}}},contexto,clientes));
 assert.throws(()=>planDivision('items',{...form,productos:{i:{otro:'1'}}},contexto,clientes),/cliente/);
});
test('Iguales, paga uno y montos COP exactos sin floats; diferencias y duplicados rechazados',()=>{
 assert.deepEqual(estimarIguales('100.00',['c','a','b']).map(p=>p.monto),['33.34','33.33','33.33']);
 assert.deepEqual(planDivision('total',{...form,cliente:'b'},contexto,clientes),[{pedido_id:'p',jugadores_id:'b'}]);
 assert.deepEqual(planDivision('equitativa',{...form,clientes:['a','b']},contexto,clientes),[{pedido_id:'p',jugadores_ids:['a','b']}]);
 assert.deepEqual(planDivision('personalizada',{...form,cuotas:[{cliente:'a',monto:'40.000'},{cliente:'b',monto:'50.000'}]},contexto,clientes)[0].cuotas,[{jugadores_id:'a',monto:'40000.00'},{jugadores_id:'b',monto:'50000.00'}]);
 for(const [input,expected]of [['3500',350000n],['3.500',350000n],['2844,44',284444n],['2.844,44',284444n]])assert.equal(montoCOP(input),expected);
 for(const rows of [[{cliente:'a',monto:'1'}],[{cliente:'a',monto:'90.001'}],[{cliente:'a',monto:'0'}],[{cliente:'a',monto:'45.000'},{cliente:'a',monto:'45.000'}]])assert.throws(()=>planDivision('personalizada',{...form,cuotas:rows},contexto,clientes));
 assert.equal(disponiblePagador(summary.participantes[0]),'10000.00');assert.equal(centavosDivision('0.51'),51n);
 assert.throws(()=>planDivision('total',{...form,cliente:'a'},{...contexto,pendiente_verificacion:'1.00'},clientes));
});
test('Servicio real: rutas, cuerpos, claves y errores backend',async()=>{
 const prev=globalThis.fetch,requests=[];
 globalThis.fetch=async(url,options)=>{
  requests.push({url,...options});
  const data=url.endsWith('/division-contexto')?{datos:contexto}:url.endsWith('/asignar-items')?{data:{participante_id:'dp',sesion_division_id:'d'}}:options.method==='POST'&&url.endsWith('/sesiones-division')?{data:{id:'d'}}:{data:summary};
  return new Response(JSON.stringify(data),{status:200});
 };
 try{
  await contextoDivision('p');await crearDivision('m','items');await asignarProductosDivision('d',{jugadores_id:'a',items:[{pedido_item_id:'i',cantidad:2}]},'clave-items');await definirCuotasDivision('d',{pedido_id:'p',jugadores_id:'a'},'clave-total');await obtenerDivision('d');await finalizarDivision('d','cancelar');await finalizarDivision('d','completar');
  assert.ok(requests[0].url.endsWith('/pedidos/p/division-contexto'));
  assert.deepEqual(JSON.parse(requests[1].body),{mesas_id:'m',modalidad:'items'});
  assert.equal(requests[2].headers.get('Idempotency-Key'),'clave-items');assert.equal(requests[3].headers.get('Idempotency-Key'),'clave-total');assert.equal(requests[5].method,'PATCH');
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'No se puede cancelar con pagos pendientes.'}),{status:409});
  await assert.rejects(()=>finalizarDivision('d','cancelar'),/pagos pendientes/);
 }finally{globalThis.fetch=prev;}
});
test('Confirmación parcial reintenta mismo cuerpo/clave sin duplicar cabecera o cliente anterior',async()=>{
 const prev=globalThis.fetch,calls=[];let fail=true;
 const attempt={mesa:'m',modalidad:'items',id:null,cursor:0,steps:[{body:{jugadores_id:'a',items:[{pedido_item_id:'i',cantidad:2}]},key:'key-carlos'},{body:{jugadores_id:'b',items:[{pedido_item_id:'i',cantidad:1}]},key:'key-laura'}]};
 globalThis.fetch=async(url,options)=>{
  calls.push({url,...options});if(url.endsWith('/sesiones-division'))return new Response(JSON.stringify({data:{id:'d'}}));
  if(url.endsWith('/asignar-items')){const body=JSON.parse(options.body);if(body.jugadores_id==='b'&&fail){fail=false;throw new Error('red');}return new Response(JSON.stringify({data:{participante_id:'dp',sesion_division_id:'d'}}));}
  return new Response(JSON.stringify({data:summary}));
 };
 let saved;
 try{
  await assert.rejects(()=>ejecutarDivision(attempt,v=>{saved=structuredClone(v);}),/servidor/);assert.equal(saved.cursor,1);assert.equal(saved.id,'d');
  await ejecutarDivision(saved,()=>{});
  assert.equal(calls.filter(r=>r.url.endsWith('/sesiones-division')).length,1);
  const items=calls.filter(r=>r.url.endsWith('/asignar-items'));assert.equal(items.length,3);assert.equal(items[1].body,items[2].body);assert.equal(items[1].headers.get('Idempotency-Key'),items[2].headers.get('Idempotency-Key'));
 }finally{globalThis.fetch=prev;}
});
test('UI real: entrada, modalidades, resumen, estados, confirmaciones y errores',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'division-ui',enforce:'pre',transform(source,filename){
  const f=filename.replaceAll('\\','/');
  if(f.endsWith('/hooks/useRemoteCatalog.js'))return source.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) { return globalThis.__divisionResources.shift();');
  if(f.endsWith('/components/CuentasPendientesSection.jsx'))return source.replace('onDivision={()=>setSelected(p.id)}','onDivision={globalThis.__abrirDivision=()=>{globalThis.__openedPedido=p.id;setSelected(p.id);}}');
  if(f.endsWith('/components/DivisionCuenta.jsx'))return source
   .replace("useState(()=>restored?.id||'')","useState(()=>globalThis.__selectedDivision || attempt.current?.id || '')")
   .replace("useState(()=>restored?.modalidad||'items')","useState(()=>globalThis.__divisionMode || restored?.modalidad || 'items')")
   .replace('[form,setForm]=useState(empty)','[form,setForm]=useState(()=>globalThis.__divisionForm || empty())')
   .replace("[error,setError]=useState('')","[error,setError]=useState(globalThis.__divisionError || '')")
   .replaceAll('setError(e.message);','globalThis.__divisionError=e.message;setError(e.message);')
   .replace("onClick={()=>{setModo(value);setForm(empty());setError('');}}","onClick={globalThis.__divisionModeButtons[value]=()=>{globalThis.__divisionMode=value;setModo(value);setForm(empty());setError('');}}")
   .replace("[confirm,setConfirm]=useState('')","[confirm,setConfirm]=useState(globalThis.__divisionConfirm || '')")
   .replace('const data=division.data,','globalThis.__divisionSubmit=submit;globalThis.__divisionLifecycle=lifecycle;const data=division.data,');
 }}]});
 const previous=globalThis.fetch;
 try{
  const {default:Main,DivisionEditor:Editor,DivisionResumen:Resumen}=await server.ssrLoadModule('/src/components/DivisionCuenta.jsx');
  const {default:Cuentas}=await server.ssrLoadModule('/src/components/CuentasPendientesSection.jsx');const {AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const render=(Component,props={},rol='Administrador')=>renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Component,props)));
  const main=(data=null,rol='Administrador',catalog={data:{contexto,clientes}})=>{globalThis.__divisionModeButtons={};globalThis.__divisionResources=[{refresh:async()=>{},...catalog},{data,refresh:async()=>{}},{data:[],refresh:async()=>{}}];return render(Main,{pedidoId:'p',onClose(){},onChanged:async()=>{}},rol);};
  await t.test('cuenta real muestra botón y cuatro modalidades sin datos simulados',()=>{
   globalThis.__divisionResources=[{data:{datos:[{id:'p',mesas_id:'m',mesa_numero:5,estado:'abierto'}],paginacion:{pagina:1,total:1,total_paginas:1}}},{data:contexto}];
   const html=render(Cuentas);assert.match(html,/Dividir cuenta/);assert.doesNotMatch(html,/P-3839|112000|Laura/);assert.equal(typeof globalThis.__abrirDivision,'function');
   globalThis.__abrirDivision();assert.equal(globalThis.__openedPedido,'p');
   const drawer=main();for(const text of ['Por productos','Partes iguales','Una persona paga todo','Montos personalizados'])assert.ok(drawer.includes(text));
   assert.doesNotMatch(drawer,/>items<|>equitativa<|jugadores_id|sesion_mesa_id/);
   globalThis.__divisionModeButtons.total();assert.match(main(),/¿Quién paga\?/);
   globalThis.__divisionModeButtons.personalizada();assert.match(main(),/Agregar cliente/);
   delete globalThis.__divisionMode;
  });
  await t.test('productos y cantidades parciales muestran asignado; exceso bloquea confirmación',()=>{
   const props={modalidad:'items',form:{...form,productos:{i:{a:'2',b:'1'}}},setForm(){},contexto,clientes,onSubmit(){}};
   assert.match(render(Editor,props),/3<!-- --> de <!-- -->4<!-- --> asignadas/);
   assert.match(render(Editor,props),/Consumo de <!-- -->Laura/);
   assert.match(render(Editor,{...props,form:{...form,productos:{i:{a:'3',b:'2'}}}}),/type="submit" disabled/);
  });
  await t.test('iguales, paga uno y personalizados tienen controles y previsualización',()=>{
   const props={setForm(){},contexto,clientes,onSubmit(){}};
   assert.match(render(Editor,{...props,modalidad:'equitativa',form:{...form,clientes:['a','b']}}),/45\.000/);
   assert.match(render(Editor,{...props,modalidad:'total',form:{...form,cliente:'b'}}),/¿Quién paga\?/);
   const html=render(Editor,{...props,modalidad:'personalizada',form:{...form,cuotas:[{cliente:'a',monto:'40.000'},{cliente:'b',monto:'50.000'}]}});assert.match(html,/Total a repartir/);assert.match(html,/Total asignado/);assert.match(html,/Falta/);assert.doesNotMatch(html,/type="submit" disabled/);
  });
  await t.test('resumen por cliente descuenta reservas del saldo visible y traduce estados',()=>{
   const html=render(Resumen,{data:summary});assert.match(html,/Carlos/);assert.match(html,/10\.000/);assert.match(html,/Activa/);
   for(const estado of ['completada','cancelada']){const h=render(Resumen,{data:{...summary,estado}});assert.match(h,/no permite cambios/);assert.doesNotMatch(h,/Confirmar división/);}
   assert.match(render(Resumen,{data:{...summary,desactualizada:true}}),/La cuenta cambió después de crear esta división/);
  });
  await t.test('permisos, terminales, desactualización y acciones de ciclo de vida',()=>{
   globalThis.__selectedDivision='d';
   const unpaid={...summary,total_pagado:'0.00',pendiente_verificacion:'0.00'};
   assert.match(main(unpaid),/Cancelar división/);assert.doesNotMatch(main(unpaid,'Mesero'),/Cancelar división|Completar división/);
   const paid={...summary,total_pendiente:'0.00',pendiente_verificacion:'0.00'};assert.match(main(paid),/Completar división/);
   for(const estado of ['completada','cancelada'])assert.doesNotMatch(main({...summary,estado}),/Confirmar división|Cancelar división|Completar división/);
   assert.doesNotMatch(main({...summary,desactualizada:true}),/Confirmar división|Completar división/);
   delete globalThis.__selectedDivision;assert.match(main(null,'Bartender'),/No tienes permiso/);
  });
  await t.test('cancelación pide confirmación y muestra error real sin simular éxito',async()=>{
   globalThis.__selectedDivision='d';globalThis.__divisionConfirm='cancelar';
   assert.match(main(summary),/¿Cancelar esta división\?/);
   let request;globalThis.fetch=async(url,options)=>{request={url,...options};return new Response(JSON.stringify({error:'Hay pagos pendientes.'}),{status:409});};
   await globalThis.__divisionLifecycle();assert.ok(request.url.endsWith('/d/cancelar'));assert.equal(request.method,'PATCH');
   assert.match(main(summary),/Hay pagos pendientes/);assert.doesNotMatch(main(summary),/División cancelada\./);
   delete globalThis.__divisionError;
   delete globalThis.__divisionConfirm;delete globalThis.__selectedDivision;
  });
  await t.test('confirmación del formulario real crea cuota, conserva clave y reconsulta',async()=>{
   globalThis.__divisionMode='total';globalThis.__divisionForm={...form,cliente:'a'};
   const requests=[];let refreshed=0;
   globalThis.fetch=async(url,options)=>{requests.push({url,...options});return new Response(JSON.stringify({data:url.endsWith('/sesiones-division')?{id:'d'}:{...summary,modalidad:'total'}}));};
   main(null,'Administrador',{data:{contexto,clientes},refresh:async()=>refreshed++});
   await globalThis.__divisionSubmit({preventDefault(){}});
   assert.equal(requests.filter(r=>r.url.endsWith('/sesiones-division')).length,1);
   const quota=requests.find(r=>r.url.endsWith('/cuotas'));assert.deepEqual(JSON.parse(quota.body),{pedido_id:'p',jugadores_id:'a'});assert.ok(quota.headers.get('Idempotency-Key'));
   assert.ok(requests.some(r=>r.url.endsWith('/d')&&r.method==='GET'));assert.equal(refreshed,1);
   delete globalThis.__divisionMode;delete globalThis.__divisionForm;
  });
  await t.test('loading, error con reintentar y clientes vacíos visibles',()=>{
   assert.match(main(null,'Administrador',{loading:true}),/Cargando/);
   assert.match(main(null,'Administrador',{error:'Error real de cuenta',refresh(){}}),/Error real de cuenta/);
   assert.match(main(null,'Administrador',{error:'Error real de cuenta',refresh(){}}),/Reintentar/);
   assert.match(main(null,'Administrador',{data:{contexto,clientes:[]}}),/No hay una cuenta abierta/);
  });
 }finally{globalThis.fetch=previous;for(const k of ['__divisionResources','__selectedDivision','__divisionConfirm','__abrirDivision','__divisionSubmit','__divisionLifecycle','__divisionMode','__divisionModeButtons','__divisionForm','__divisionError','__openedPedido'])delete globalThis[k];await server.close();}
});
