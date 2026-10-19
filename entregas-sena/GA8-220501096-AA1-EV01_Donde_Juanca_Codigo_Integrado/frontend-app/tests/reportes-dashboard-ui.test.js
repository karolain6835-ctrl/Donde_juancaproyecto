import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

test('Controles de reportes y apertura de acciones respetan permisos y navegación',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const {ReporteControles,ReportePaginacion}=await server.ssrLoadModule('/src/components/ReporteRemote.jsx');
  const {useQuickAction}=await server.ssrLoadModule('/src/hooks/useQuickAction.js');
  const resource={loading:false,data:{paginas:3,total:45},refresh:()=>{}};
  await t.test('recarga accesible sin paginación entre los controles',()=>{
   const html=renderToString(React.createElement(ReporteControles,{resource,periodo:'hoy',nota:'Pagos confirmados.'}));
   assert.match(html,/aria-label="Actualizar datos"/);
   assert.doesNotMatch(html,/Anterior|Siguiente|Página/);
  });
  await t.test('reportes sin recarga no dejan controles vacíos y conservan las fechas',()=>{
   const props={resource,refresh:false,desde:'',hasta:'',setDesde:()=>{},setHasta:()=>{},setPagina:()=>{}};
   assert.equal(renderToString(React.createElement(ReporteControles,{...props,periodo:'hoy'})),'');
   const html=renderToString(React.createElement(ReporteControles,{...props,periodo:'personalizado'}));
   assert.match(html,/Desde/);assert.match(html,/Hasta/);assert.doesNotMatch(html,/Actualizar datos/);
  });
  await t.test('paginación conserva límites y número real de resultados',()=>{
   const render=pagina=>renderToString(React.createElement(ReportePaginacion,{resource,pagina,setPagina:()=>{}})).replaceAll('<!-- -->','');
   assert.match(render(1),/disabled="">Anterior/);
   assert.match(render(3),/disabled="">Siguiente/);
   assert.match(render(2),/Página 2 de 3/);
   assert.match(render(2),/45 resultados/);
  });
  await t.test('acción válida abre; sin permiso o con otra acción permanece cerrada',()=>{
   function Form({permitted}){const [open]=useQuickAction('producto',permitted);return React.createElement('span',null,open?'abierto':'cerrado');}
   const render=(state,permitted)=>renderToString(React.createElement(MemoryRouter,{initialEntries:[{pathname:'/inventario',state}]},React.createElement(Form,{permitted})));
   assert.match(render({quickAction:'producto'},true),/abierto/);
   assert.match(render({quickAction:'producto'},false),/cerrado/);
   assert.match(render({quickAction:'usuario'},true),/cerrado/);
   assert.match(render(null,true),/cerrado/);
  });
 }finally{await server.close();}
});
