import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

test('PedidoDetalle real integra rondas vacías, existentes, históricas, borrador y errores', async t => {
  const previousFetch=globalThis.fetch;
  const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{
    name:'pedido-rondas-integration',enforce:'pre',transform(source,filename){
      const f=filename.replaceAll('\\','/');
      if(f.endsWith('/hooks/useRemoteCatalog.js'))return source.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) { return loader.toString().includes("listarClientes") ? {data:{datos:[],total:0,limite:20}} : globalThis.__pedidoRondasResources.shift();');
      if(f.endsWith('/components/RondasConsumo.jsx'))return source
        .replace('const [draft,setDraft]=useState(null)', 'const [draft,realSetDraft]=useState(globalThis.__pedidoRondasDraft || null);const setDraft=value=>{globalThis.__pedidoRondasDraft=value;realSetDraft(value);}')
        .replace("onClick={()=>{setSuccess('');setDraft({ lines:base });}}", "onClick={globalThis.__nuevaRonda=()=>{setSuccess('');setDraft({ lines:base });}}");
    }
  }]});
  try {
    const {default:Pedido}=await server.ssrLoadModule('/src/components/PedidoDetalle.jsx');
    const {AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
    const {detallePedido}=await server.ssrLoadModule('/src/services/pedidosService.js');
    const {listarRondas}=await server.ssrLoadModule('/src/services/rondasConsumoService.js');
    const persons=[{id:'a',nombre:'Carlos',tipo_participante:'temporal'}];
    const pedido={id:'p',mesas_id:'m',usuarios_id:'u',clientes_id:null,estado:'abierto',sesion_mesa_id:'s',items:[{id:'old',productos_id:'pr',participante_id:'a',cantidad_pedida:2,precio_unitario:100,estado:'servido',ronda_consumo_id:null}]};
    const props={id:'p',mesas:{data:[{id:'m',numero:1}]},productos:{data:[]},onClose(){},onChanged(){}};
    const render=(order,rounds,extra=[])=>{
      globalThis.__pedidoRondasResources=[{data:order},{data:persons},rounds,...extra];
      return renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol:'Mesero'}}},React.createElement(Pedido,props)));
    };
    await t.test('GET vacío conserva título y nueva ronda entre participantes y productos',async()=>{
      const urls=[];globalThis.fetch=async url=>{urls.push(url);return new Response(JSON.stringify({datos:url.endsWith('/rondas')?[]:pedido}));};
      const order=await detallePedido('p'),rounds=await listarRondas('p');
      const html=render(order,{data:rounds});
      assert.ok(urls.some(url=>url.endsWith('/pedidos/p/rondas')));
      assert.match(html,/Rondas de consumo/);assert.ok(html.includes('>Ronda</button>'));assert.doesNotMatch(html,/Nueva ronda|Repetir ronda/);
      assert.ok(html.indexOf('Clientes en la mesa')<html.indexOf('Rondas de consumo'));
      assert.ok(html.indexOf('Rondas de consumo')<html.indexOf('Productos del pedido'));
    });
    await t.test('pedido histórico sin visita también muestra rondas y abre borrador editable',()=>{
      const legacy={...pedido,sesion_mesa_id:null};
      assert.match(render(legacy,{data:[]}),/Rondas de consumo/);
      globalThis.__nuevaRonda();
      assert.deepEqual(globalThis.__pedidoRondasDraft.lines,[{participante_id:'a',productos_id:'pr',cantidad:'2'}]);
      const html=render(legacy,{data:[]},[{data:{productos:[{id:'pr',codigo:'P',nombre:'Club Colombia',stock:10,activo:true}],participantes:persons}},{data:{datos:[]}}]);
      assert.match(html,/Ronda/);assert.match(html,/Carlos/);assert.match(html,/Club Colombia/);assert.match(html,/Cantidad/);assert.match(html,/Confirmar ronda/);
      delete globalThis.__pedidoRondasDraft;
    });
    await t.test('ronda existente ofrece repetición sin ocultar alta ordinaria',()=>{
      const html=render(pedido,{data:[{id:'r',numero_ronda:1,estado:'confirmada',items:[{id:'i',participante_id:'a',productos_id:'pr',participante_nombre:'Carlos',producto:'Club Colombia',cantidad_pedida:3}]}]});
      assert.match(html,/Ronda <!-- -->1/);assert.match(html,/Carlos/);assert.match(html,/Club Colombia/);assert.ok(html.includes('>Ronda</button>'));assert.match(html,/Agregar producto/);
      globalThis.__nuevaRonda();assert.equal(globalThis.__pedidoRondasDraft.lines[0].cantidad,'3');
      delete globalThis.__pedidoRondasDraft;
    });
    await t.test('sin consumos no hay seccion ni accion vacia',()=>{
      assert.doesNotMatch(render({...pedido,items:[]},{data:[]}),/Rondas de consumo|>Ronda<|Nueva ronda/);
    });
    await t.test('carga fallida conserva sección, mensaje y reintento',()=>{
      const html=render(pedido,{error:'Error real de API',refresh(){}});
      assert.match(html,/Rondas de consumo/);assert.match(html,/No fue posible cargar las rondas\./);assert.match(html,/Error real de API/);assert.match(html,/Reintentar/);
      assert.doesNotMatch(html,/Aún no hay rondas/);
    });
  } finally {
    globalThis.fetch=previousFetch;
    for(const key of ['__pedidoRondasResources','__pedidoRondasDraft','__nuevaRonda'])delete globalThis[key];
    await server.close();
  }
});
