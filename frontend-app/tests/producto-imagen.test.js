import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import {createServer} from 'vite';import {fileURLToPath} from 'node:url';
import {imagenProductoUrl,validarImagenProducto,subirImagenProducto,eliminarImagenProducto} from '../src/services/productoImagenService.js';
import {adaptProductos} from '../src/services/productosService.js';
const ruta='/uploads/productos/12345678-abcd-abcd-abcd-123456789abc.webp';
test('Imagen: rutas locales generadas, límite y tipos; nunca cargar rutas externas/arbitrarias',()=>{
  assert.ok(imagenProductoUrl(ruta).endsWith(ruta));for(const value of [null,'',undefined,'https://otro.invalid/a.jpg','javascript:alert(1)','/uploads/productos/../../a','/uploads/productos/imagen.png'])assert.equal(imagenProductoUrl(value),null);
  for(const type of ['image/jpeg','image/png','image/webp'])assert.equal(validarImagenProducto({type,size:5*1024*1024}),'');
  assert.ok(validarImagenProducto({type:'image/svg+xml',size:10}));assert.ok(validarImagenProducto({type:'image/png',size:5*1024*1024+1}));
});
test('Servicio usa multipart con Bearer existente sin forzar Content-Type; eliminación y errores',async()=>{
  const old=globalThis.fetch,calls=[];try{
    globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({datos:{id:'p',imagen_url:options.method==='DELETE'?null:ruta}}));};
    await subirImagenProducto('p',new File(['contenido'],'p.png',{type:'image/png'}));await eliminarImagenProducto('p');
    assert.ok(calls[0].url.endsWith('/productos/p/imagen'));assert.equal(calls[0].options.method,'PUT');assert.ok(calls[0].options.body instanceof FormData);assert.equal(calls[0].options.headers.has('Content-Type'),false);assert.ok(calls[0].options.body.get('imagen') instanceof File);assert.equal(calls[1].options.method,'DELETE');
    for(const status of [400,403,404,413,415]){globalThis.fetch=async()=>new Response(JSON.stringify({error:'Error seguro'}),{status});await assert.rejects(()=>subirImagenProducto('p',new File(['x'],'p.png',{type:'image/png'})),e=>e.status===status&&e.message==='Error seguro');}
    const n=calls.length;await assert.rejects(()=>subirImagenProducto('p',new File(['x'],'p.svg',{type:'image/svg+xml'})));assert.equal(calls.length,n);
  }finally{globalThis.fetch=old;}
});
test('Catálogo mantiene compatibilidad con productos antiguos sin campo de imagen',()=>{
  const row={id:'p',nombre:'Producto',codigo:'P',categoria_nombre:'Cat',proveedores_id:'prov',estado:'activo',historial_costos_id:null,categorias_id:1,cantidad_disponible:2,stock_minimo:1,costo_promedio_ponderado:'0.00',precio_venta:'2844.44'};
  assert.equal(adaptProductos({datos:[row]})[0].imagen_url,null);assert.equal(adaptProductos({datos:[{...row,imagen_url:ruta}]})[0].imagen_url,ruta);
});
test('Placeholder, imagen rota, imagen real y editor opcional con quitar/conservar',async()=>{
  const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'imagen-fallback',enforce:'pre',transform(s,f){if(f.replaceAll('\\','/').endsWith('/components/ProductoImagen.jsx'))return s.replace('useState(null)','useState(globalThis.__imagenFallida||null)');}}]});
  try{
    const {default:Imagen}=await server.ssrLoadModule('/src/components/ProductoImagen.jsx'),{default:Editor}=await server.ssrLoadModule('/src/components/ProductoImagenEditor.jsx');
    const render=url=>renderToString(React.createElement(Imagen,{url,nombre:'Producto real'}));
    assert.match(render(null),/Sin imagen de Producto real/);assert.match(render(null),/lucide-bottle-wine/);assert.doesNotMatch(render(null),/lucide-package/);assert.doesNotMatch(render(null),/<img /);assert.match(render(ruta),/<img /);assert.match(render(ruta),/Imagen de Producto real/);
    globalThis.__imagenFallida=imagenProductoUrl(ruta);assert.doesNotMatch(render(ruta),/<img /);assert.match(render(ruta),/Sin imagen/);delete globalThis.__imagenFallida;
    const editor=value=>renderToString(React.createElement(Editor,{actual:ruta,value,onChange(){}}));
    assert.match(editor({archivo:null,eliminar:false,error:''}),/Imagen del producto \(opcional\)/);assert.match(editor({archivo:null,eliminar:false,error:''}),/Quitar imagen/);
    assert.match(editor({archivo:null,eliminar:true,error:''}),/Conservar imagen actual/);assert.match(editor({archivo:null,eliminar:true,error:''}),/se quitará al guardar/);
    assert.match(editor({archivo:null,eliminar:false,error:'Archivo inválido'}),/role="alert"/);
  }finally{delete globalThis.__imagenFallida;await server.close();}
});
