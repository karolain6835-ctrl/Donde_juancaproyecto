import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

test('Selector de cliente de mesa distingue vacío, datos, carga y error',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'cliente-mesa-test',enforce:'pre',transform(s,f){
  f=f.replaceAll('\\','/');
  if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {return globalThis.__clienteMesaResource;');
  if(f.endsWith('/components/ParticipanteVisitaSelector.jsx'))return s.replace('useState(false)','useState(true)');
 }}]});
 try{
  const {default:Selector}=await server.ssrLoadModule('/src/components/ParticipanteVisitaSelector.jsx');
  const render=resource=>{globalThis.__clienteMesaResource=resource;return renderToString(React.createElement(Selector,{mesaId:'m',onSelect(){},onAdd(){}}));};
  await t.test('mesa vacía ofrece acción real sin selector vacío',()=>{
   const html=render({data:{datos:[]}});assert.match(html,/No hay clientes asociados a esta mesa/);assert.match(html,/>Agregar cliente<\/button>/);assert.doesNotMatch(html,/<select|Selecciona un cliente|Elegir cliente de la mesa/);
  });
  await t.test('mesa con personas mantiene identificadores y opciones reales',()=>{
   const html=render({data:{datos:[{id:'persona-real',nombre:'Laura',tipo_participante:'temporal'}]}});assert.match(html,/value="persona-real"/);assert.match(html,/Laura/);assert.doesNotMatch(html,/No hay clientes asociados/);
  });
  await t.test('carga y error no se presentan como mesa vacía',()=>{
   assert.match(render({loading:true}),/Cargando clientes/);const error=render({error:'Fallo de consulta',refresh(){}});assert.match(error,/Reintentar/);assert.doesNotMatch(error,/No hay clientes asociados|<select/);
  });
 }finally{delete globalThis.__clienteMesaResource;await server.close();}
});
