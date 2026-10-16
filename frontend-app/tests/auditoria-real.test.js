import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {listarAuditoria,nombreAuditoria} from '../src/services/auditoriaService.js';
const evento={id:'id-tecnico',categoria:'inventario',tipo_evento:'alerta_vista',entidad:'alertas_inventario',entidad_id:'referencia-tecnica',creado_en:'2026-10-16T15:00:00Z',usuarios_id:'u',usuario_nombre:'Ana real',resultado:'exitoso',detalle:{antes:{estado:'activa'},despues:{estado:'vista'},items:[{cantidad:2}]},detalle_omitido:true};
const datos={datos:[evento],paginacion:{pagina:2,limite:20,total:41,total_paginas:3}};
test('auditoría service: query backend real, paginación, mensajes y nombres legibles',async()=>{
 const old=globalThis.fetch;try{
  globalThis.fetch=async(u,o)=>{const q=new URL(u).searchParams;assert.match(u,/\/api\/auditoria\?/);assert.equal(o.method,'GET');for(const [k,v]of Object.entries({pagina:'2',limite:'20',fecha_desde:'2026-10-01',fecha_hasta:'2026-10-16',usuario:'u',accion:'alerta_vista',modulo:'inventario'}))assert.equal(q.get(k),v);return new Response(JSON.stringify(datos));};
  assert.deepEqual(await listarAuditoria({pagina:2,limite:20,fecha_desde:'2026-10-01',fecha_hasta:'2026-10-16',usuario:'u',accion:'alerta_vista',modulo:'inventario'}),datos);assert.equal(nombreAuditoria('alerta_vista'),'Alerta vista');
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'No fue posible consultar la auditoría.'}),{status:500});await assert.rejects(()=>listarAuditoria(),/No fue posible/);
  globalThis.fetch=async()=>new Response(JSON.stringify({datos:[]}));await assert.rejects(()=>listarAuditoria(),/inválida/);
 }finally{globalThis.fetch=old;}
});
test('AuditoriaSection real: filtros aplicados, limpiar, paginación, detalle y permisos',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'auditoria-test',enforce:'pre',transform(s,f){f=f.replaceAll('\\','/');if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {globalThis.__auditLoaders.push(loader);return globalThis.__auditResources.shift();');if(f.endsWith('/components/AuditoriaSection.jsx'))return s.replace('useState(inicial)','useState(globalThis.__auditForm||inicial)').replace('useState(null)','useState(globalThis.__auditSelected||null)').replace('if(!permitido)return','globalThis.__auditFiltrar=filtrar;globalThis.__auditLimpiar=limpiar;globalThis.__auditPagina=pagina;globalThis.__auditRetry=resource.refresh;if(!permitido)return').replace('setQuery({...form,pagina:1,limite:20})','(globalThis.__auditQuery={...form,pagina:1,limite:20},setQuery({...form,pagina:1,limite:20}))').replace('setQuery({pagina:1,limite:20})','(globalThis.__auditQuery={pagina:1,limite:20},setQuery({pagina:1,limite:20}))').replace('setQuery({...query,pagina:n})','(globalThis.__auditQuery={...query,pagina:n},setQuery({...query,pagina:n}))');}}]});
 try{
  const {default:Auditoria}=await server.ssrLoadModule('/src/components/AuditoriaSection.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const resource={data:datos,loading:false,error:'',refresh:async()=>{}};
  const render=(rol='Administrador',r=resource)=>{globalThis.__auditLoaders=[];globalThis.__auditResources=[r,{data:[{id:'u',nombre:'Ana real',rol:'Administrador'}]}];return renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Auditoria)));};
  await t.test('listado real, actor legible y paginación',()=>{
   const html=render().replace(/<!-- -->/g,'');for(const texto of ['Ana real','Alerta vista','Inventario','Ver detalle','Página 2 de 3','Limpiar filtros'])assert.ok(html.includes(texto),texto);assert.doesNotMatch(html,/>id-tecnico</);
  });
  await t.test('aplica filtros en query, limpiar y cambiar página no filtran arrays localmente',()=>{
   globalThis.__auditForm={fecha_desde:'2026-10-01',fecha_hasta:'2026-10-16',usuario:'u',accion:'alerta_vista',modulo:'inventario'};render();globalThis.__auditFiltrar({preventDefault(){}});assert.deepEqual(globalThis.__auditQuery,{...globalThis.__auditForm,pagina:1,limite:20});globalThis.__auditLimpiar();assert.deepEqual(globalThis.__auditQuery,{pagina:1,limite:20});globalThis.__auditPagina(3);assert.equal(globalThis.__auditQuery.pagina,3);
  });
  await t.test('detalle estructurado sin JSON crudo, referencia secundaria y aviso de contenido omitido',()=>{
   globalThis.__auditSelected=evento;const html=render();assert.match(html,/Cambios del evento/);assert.match(html,/referencia-tecnica/);assert.match(html,/información sensible/);assert.match(html,/Cantidad/);assert.doesNotMatch(html,/<pre|password|JWT|OTP|AUD-1041/);globalThis.__auditSelected=null;
  });
  await t.test('carga, vacío, error y reintento reales',async()=>{
   assert.match(render('Administrador',{...resource,loading:true}),/Cargando información/);assert.match(render('Administrador',{...resource,data:{...datos,datos:[]}}),/No hay eventos de auditoría para los filtros seleccionados/);
   let reads=0;assert.match(render('Administrador',{...resource,error:'Error real',refresh:async()=>reads++}),/Reintentar/);await globalThis.__auditRetry();assert.equal(reads,1);
  });
  await t.test('solo Administrador/SuperAdmin; otros roles no consultan endpoint ni usuarios',async()=>{
   assert.match(render('SuperAdmin'),/Ana real/);for(const rol of ['Mesero','Mesera','Cajero','Bartender']){assert.match(render(rol),/No tienes permiso/);for(const loader of globalThis.__auditLoaders){const result=await loader({});assert.ok(result===null||Array.isArray(result)&&result.length===0);}}
  });
 }finally{for(const k of ['__auditLoaders','__auditResources','__auditForm','__auditSelected','__auditFiltrar','__auditLimpiar','__auditPagina','__auditRetry','__auditQuery'])delete globalThis[k];await server.close();}
});
test('sin eventos simulados ni filtrado local de eventos',()=>{
 const s=readFileSync(new URL('../src/components/AuditoriaSection.jsx',import.meta.url),'utf8');assert.doesNotMatch(s,/AUD-1041|PG-899|PROD-014|registros\.filter|registros = \[/);
});
