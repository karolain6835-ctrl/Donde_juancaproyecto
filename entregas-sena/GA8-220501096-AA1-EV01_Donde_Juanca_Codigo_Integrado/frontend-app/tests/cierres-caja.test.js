import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {periodoCierre,arqueoCierre,resumenCierre,crearCierre,listarCierres,detalleCierre} from '../src/services/cierresCajaService.js';
const periodo={fecha_inicio:'2026-10-14T00:00:00',fecha_fin:'2026-10-15T00:00:00'};
const resumen={cantidad_pagos:2,total_general:'70000.50',efectivo_esperado:'50000.50',por_metodo:{efectivo:'50000.50',nequi:'20000.00',daviplata:'0.00',tarjeta:'0.00'},pagos:[]};
const cierre={id:'c',fecha:'2026-10-14T12:00:00Z',responsable_nombre:'Ana',total_general:'70000.50',total_efectivo_esperado:'50000.50',total_efectivo_real:'49000.50',diferencia_efectivo:'-1000.00',fecha_inicio:periodo.fecha_inicio+'Z',fecha_fin:periodo.fecha_fin+'Z',reporte:{datos_json:resumen},pagos:[{id:'cp',metodo_de_pago:'efectivo',importe:'50000.50'}]};
test('arqueo COP exacto y fechas locales convertidas al contrato UTC',()=>{
 assert.equal(arqueoCierre('50.000,50','50000.50').tipo,'Sin diferencia');assert.equal(arqueoCierre('49.000,50','50000.50').diferencia,'-1000.00');assert.equal(arqueoCierre('51.000,50','50000.50').tipo,'Sobrante');assert.equal(arqueoCierre('0','0.00').tipo,'Sin diferencia');assert.throws(()=>arqueoCierre('-1','0.00'));
 const dates=periodoCierre(periodo);assert.equal(dates.fecha_inicio,new Date(periodo.fecha_inicio).toISOString().slice(0,19));assert.throws(()=>periodoCierre({...periodo,fecha_fin:periodo.fecha_inicio}));
});
test('servicio cierres reutiliza contratos sin enviar esperado ni actor',async()=>{
 const old=globalThis.fetch;try{let body;globalThis.fetch=async(url,o)=>{body=o.body&&JSON.parse(o.body);return new Response(JSON.stringify(o.method==='POST'?{cierre}:url.includes('/resumen')?resumen:url.endsWith('/c')?{cierre}:{datos:[cierre],total:1}));};assert.equal((await resumenCierre(periodo)).cantidad_pagos,2);await crearCierre(periodo,'49.000,50');assert.deepEqual(body,{...periodo,total_efectivo_real:'49000.50'});assert.equal((await listarCierres({pagina:1})).datos[0].id,'c');assert.equal((await detalleCierre('c')).id,'c');}finally{globalThis.fetch=old;}
});
test('UI cierres: resumen, arqueo, confirmacion, historial, detalle y permisos',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'cierre-test',enforce:'pre',transform(s,f){f=f.replaceAll('\\','/');
  if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {return globalThis.__cierreResource;');
  if(f.endsWith('/components/CierreCajaReal.jsx'))return s.replace("useState(''),[confirm,setConfirm]=useState(false)","useState(globalThis.__contado||''),[confirm,setConfirm]=useState(globalThis.__confirm||false)").replace('return <section className="cierre-real-panel"><h3>Cerrar caja','globalThis.__guardarCierre=guardar;return <section className="cierre-real-panel"><h3>Cerrar caja');
 }}]});const old=globalThis.fetch;
 try{
  const {default:Main}=await server.ssrLoadModule('/src/components/CierresCajaSection.jsx'),{NuevoCierre,DetalleCierre}=await server.ssrLoadModule('/src/components/CierreCajaReal.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const render=(Component,props={},resource={},rol='Cajero')=>{globalThis.__cierreResource=resource;return renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Component,props)));};
  await t.test('resumen contado COP diferencia y confirmacion antes de enviar',async()=>{globalThis.__contado='49.000,50';let html=render(NuevoCierre,{periodo},{data:resumen});assert.match(html,/Faltante/);assert.match(html,/49\.000,50/);assert.match(html,/Revisar cierre/);assert.doesNotMatch(html,/Confirmar cierre/);globalThis.__confirm=true;html=render(NuevoCierre,{periodo,onClosed:async c=>assert.equal(c.id,'c')},{data:resumen});assert.match(html,/Confirmar cierre/);let count=0;globalThis.fetch=async()=>{count++;return new Response(JSON.stringify({cierre}),{status:201});};await globalThis.__guardarCierre();assert.equal(count,1);delete globalThis.__confirm;delete globalThis.__contado;});
  await t.test('historico y detalle muestran responsables reales y metodos',()=>{let html=render(Main,{}, {data:{datos:[cierre],total:1,responsables:[{id:'u',nombre:'Ana'}]}});for(const text of ['Ana','Historial de cierres','Ver detalle','Faltante','Efectivo contado'])assert.ok(html.includes(text));assert.doesNotMatch(html,/CJ-041|Saldo inicial|Karol/);html=render(DetalleCierre,{id:'c'},{data:cierre});assert.match(html,/Pagos incluidos/);assert.match(html,/Nequi/);assert.match(html,/50\.000,50/);});
  await t.test('vacio error reintento carga y permisos',()=>{assert.match(render(Main,{}, {data:{datos:[],total:0}}),/Aún no hay cierres de caja/);assert.match(render(Main,{}, {error:'Error real'}),/Reintentar/);assert.match(render(Main,{}, {loading:true}),/Cargando/);assert.match(render(Main,{}, {},'Mesera'),/No tienes permiso/);assert.doesNotMatch(render(NuevoCierre,{periodo},{data:{...resumen,cantidad_pagos:0}}),/Confirmar cierre/);});
 }finally{globalThis.fetch=old;for(const key of ['__cierreResource','__contado','__confirm','__guardarCierre'])delete globalThis[key];await server.close();}
});
