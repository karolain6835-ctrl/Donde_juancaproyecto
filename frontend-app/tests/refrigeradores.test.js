import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {listarRefrigeradores,guardarRefrigerador,refrigeradorBody} from '../src/services/refrigeradoresService.js';
import {can} from '../src/utils/permissions.js';
const row={id:'real',nombre:'Equipo real',ubicacion:'Barra real',estado:'activa'};
test('Servicio refrigeradores: contratos reales y validaciones',async()=>{
 assert.deepEqual(refrigeradorBody({...row,temperatura:5,ubicacion:''}),{nombre:'Equipo real',ubicacion:null,estado:'activa'});
 for(const patch of [{nombre:''},{nombre:'x'.repeat(81)},{ubicacion:'x'.repeat(46)},{estado:'inactivo'}])assert.throws(()=>refrigeradorBody({...row,...patch}));
 const old=globalThis.fetch;try{const calls=[];globalThis.fetch=async(u,o)=>{calls.push({u,o});return new Response(JSON.stringify(o.method==='GET'?{datos:[row]}:{refrigerador:row}),{status:o.method==='POST'?201:200});};
 assert.deepEqual(await listarRefrigeradores(),[row]);await guardarRefrigerador(row);await guardarRefrigerador(row,'real');assert.deepEqual(calls.map(c=>c.o.method),['GET','POST','PUT']);assert.ok(calls[2].u.endsWith("/refrigeradores/real"));assert.deepEqual(Object.keys(JSON.parse(calls[1].o.body)).sort(),['estado','nombre','ubicacion']);
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'Refrigerador no encontrado.'}),{status:404});await assert.rejects(()=>guardarRefrigerador(row,'ausente'),/no encontrado/);
 }finally{globalThis.fetch=old;}
});
test('Refrigeradores reales renderizados: catalogo, formulario, estados remotos, permisos y reconsulta',async t=>{
 const old=globalThis.fetch;let refreshed=0,mermaRefreshed=0;
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'fridge-test',enforce:'pre',transform(s,f){f=f.replaceAll('\\','/');if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {return globalThis.__fridgeResource;');if(f.endsWith('/components/RefrigeradoresSection.jsx'))return s.replace('useState(null),[form,setForm]=useState(null),[editingId,setEditingId]=useState(null)','useState(globalThis.__fridgeSelected||null),[form,setForm]=useState(globalThis.__fridgeForm||null),[editingId,setEditingId]=useState(globalThis.__fridgeEditing||null)').replace(' const close=',' globalThis.__fridgeSave=save;globalThis.__fridgeEstado=estado; const close=');}}]});
 try{const {default:Main}=await server.ssrLoadModule('/src/components/RefrigeradoresSection.jsx');const {AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
 const render=(resource={data:[row]},rol='Administrador')=>{globalThis.__fridgeResource={refresh:async()=>{refreshed++;},...resource};return renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Main,{onChanged:async()=>{mermaRefreshed++;}})));};
 await t.test('listado real y ausencia de temperaturas, conteos y productos ficticios',()=>{const html=render();assert.match(html,/Equipo real/);assert.match(html,/Barra real/);assert.match(html,/Crear refrigerador/);assert.doesNotMatch(html,/REF-001|Poker|Coca-Cola|Temperatura|28 unidades/);globalThis.__fridgeSelected='real';const detail=render();assert.match(detail,/Editar refrigerador/);assert.match(detail,/existencias por refrigerador aún no están disponibles/);globalThis.__fridgeSelected=null;});
 await t.test('carga, error con reintento y vacio reales',()=>{assert.match(render({loading:true}),/Cargando refrigeradores/);assert.match(render({error:'Fallo API'}),/Fallo API.*Reintentar/);assert.match(render({data:[]}),/Aún no hay refrigeradores/);});
 await t.test('roles no autorizados no administran',()=>{for(const rol of ['Mesero','Mesera','Bartender','Cajero']){assert.equal(can({rol},'refrigeradores.ver'),false);assert.doesNotMatch(render({data:[row]},rol),/Crear refrigerador|Editar refrigerador/);}assert.equal(can({rol:'SuperAdmin'},'refrigeradores.editar'),true);});
 await t.test('crear y editar envian campos reales; reconsultan catalogo y selector de mermas',async()=>{
  for(const id of [null,'real']){globalThis.__fridgeForm={nombre:'Nuevo nombre',ubicacion:'Nueva zona',estado:'mantenimiento'};globalThis.__fridgeEditing=id;const html=render();assert.match(html,id?/Editar refrigerador/:/Crear refrigerador/);let sent;globalThis.fetch=async(u,o)=>{sent={u,o};return new Response(JSON.stringify({refrigerador:{...row,...globalThis.__fridgeForm}}),{status:id?200:201});};await globalThis.__fridgeSave({preventDefault(){}});assert.equal(sent.o.method,id?'PUT':'POST');assert.deepEqual(JSON.parse(sent.o.body),globalThis.__fridgeForm);assert.equal(row.nombre,'Equipo real');}
  assert.equal(refreshed,2);assert.equal(mermaRefreshed,2);globalThis.__fridgeForm=null;
 });
 await t.test('cambiar estado persiste sin sumar stock local; error no refresca',async()=>{render();let body;globalThis.fetch=async(u,o)=>{body=JSON.parse(o.body);return new Response(JSON.stringify({refrigerador:{...row,estado:'apagada'}}));};await globalThis.__fridgeEstado(row,'apagada');assert.equal(body.estado,'apagada');assert.equal(row.estado,'activa');assert.equal(refreshed,3);globalThis.fetch=async()=>new Response(JSON.stringify({error:'Fallo real'}),{status:500});render();await globalThis.__fridgeEstado(row,'mantenimiento');assert.equal(refreshed,3);});
 }finally{globalThis.fetch=old;for(const k of Object.keys(globalThis))if(k.startsWith('__fridge'))delete globalThis[k];await server.close();}
});
