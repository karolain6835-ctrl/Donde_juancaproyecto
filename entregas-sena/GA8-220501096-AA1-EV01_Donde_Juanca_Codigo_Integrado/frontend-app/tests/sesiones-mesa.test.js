import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { listarParticipantesMesa, agregarParticipanteMesa, consumosParticipante, listarParticipantes } from '../src/services/participantesService.js';
const persons = [{ id:'carlos',nombre:'Carlos',tipo_participante:'registrado',clientes_id:'c',sesion_mesa_id:'visita',pedido_id:null },{ id:'laura',nombre:'Laura',tipo_participante:'temporal',clientes_id:null,sesion_mesa_id:'visita',pedido_id:null }];
const consumo = { sesion_mesa_id:'visita',participante:persons[0],items:[{ id:'i1',pedidos_id:'p1' },{ id:'i2',pedidos_id:'p2' }],resumen_productos:[{ productos_id:'pr',producto:'Poker',cantidad_total:3,subtotal_total:'310.00' }],total_consumido:'310.00' };
test('Servicios de visita: mismo ámbito en dos pedidos, lectura por mesa, alta y consumo real', async () => {
  const previous = globalThis.fetch; let request;
  globalThis.fetch = async (url,options) => {
    request = { url,...options };
    const result = url.endsWith('/consumos') ? { datos:consumo } : options.method === 'POST' ? { datos:persons[1] } : url.includes('/mesas/') ? { sesion:{ id:'visita',estado:'activa' },datos:persons } : { datos:persons };
    return new Response(JSON.stringify(result),{ status:options.method === 'POST' ? 201 : 200 });
  };
  try {
    assert.deepEqual(await listarParticipantes('p1'),await listarParticipantes('p2'));
    const visit = await listarParticipantesMesa('m'); assert.equal(visit.sesion.id,'visita'); assert.equal(visit.datos.length,2);
    assert.equal((await agregarParticipanteMesa('m',{ tipo_participante:'temporal',nombre:'Laura' })).id,'laura');
    assert.ok(request.url.endsWith('/mesas/m/sesion-activa/participantes')); assert.equal(request.method,'POST');
    assert.deepEqual(JSON.parse(request.body),{ tipo_participante:'temporal',nombre:'Laura' });
    assert.deepEqual(await consumosParticipante('visita','carlos'),consumo); assert.ok(request.url.endsWith('/mesas/sesiones/visita/participantes/carlos/consumos'));
  } finally { globalThis.fetch = previous; }
});
test('UI de visita en mesa y pedidos conserva identidades y muestra consumos acumulados', async t => {
  const server = await createServer({ root:fileURLToPath(new URL('..',import.meta.url)),server:{ middlewareMode:true },appType:'custom',plugins:[{ name:'visita-recursos-test',enforce:'pre',transform(source,filename) {
    if (filename.replaceAll('\\','/').endsWith('/hooks/useRemoteCatalog.js')) return source.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) { return globalThis.__visitResources.shift() || { data: { datos: [] } };');
  } }] });
  try {
    const { default:Mesa } = await server.ssrLoadModule('/src/components/MesaDetalle.jsx');
    const { default:Pedido } = await server.ssrLoadModule('/src/components/PedidoDetalle.jsx');
    const { default:Consumos } = await server.ssrLoadModule('/src/components/ParticipanteConsumos.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const render = (Component,props) => renderToString(React.createElement(MemoryRouter,null,React.createElement(AuthContext.Provider,{ value:{ user:{ rol:'Cajero' } } },React.createElement(Component,props))));
    await t.test('mesa muestra una lista de la visita para dos pedidos',() => {
      globalThis.__visitResources = [{ data:{ resumen:{ subtotal_productos:0,total_general:0 },detalle_productos:[],detalle_juegos:[] } },{ data:{ datos:[{ id:'p1' },{ id:'p2' }] } },{ data:{ puede_liberarse:false } },{ data:{ sesion:{ id:'visita',estado:'activa' },datos:persons } }];
      const html = render(Mesa,{ id:'m',mesas:{ data:[{ id:'m',numero:1,estado:'ocupada' }] } });
      assert.match(html,/Clientes en la mesa/); assert.ok(html.includes('<small>Registrado</small>')); assert.ok(html.includes('<small>Temporal</small>')); assert.equal(html.split('<strong>Carlos</strong>').length-1,1); assert.equal(html.split('<strong>Laura</strong>').length-1,1);
      assert.doesNotMatch(html,/<h3>Rondas<\/h3>/); assert.match(html,/p1/); assert.match(html,/p2/); assert.equal(html.split('Ver consumos').length-1,2);
    });
    await t.test('mesa sin clientes o sin sesión activa oculta la sección, conservando errores visibles',() => {
      const renderMesa = visit => {
        globalThis.__visitResources = [{ data:{ resumen:{ subtotal_productos:0,total_general:0 },detalle_productos:[],detalle_juegos:[] } },{ data:{ datos:[] } },{ data:{ puede_liberarse:true } },visit];
        return render(Mesa,{ id:'m',mesas:{ data:[{ id:'m',numero:1,estado:'disponible' }] } });
      };
      for (const data of [{ sesion:{ id:'visita',estado:'activa' },datos:[] },{ sesion:null,datos:[] },{ sesion:{ id:'visita',estado:'cerrada' },datos:persons }]) {
        const html=renderMesa({data});
        assert.doesNotMatch(html,/Clientes en la mesa|Aún no hay participantes asociados|Agregar cliente/);
      }
      assert.match(renderMesa({error:'Error real de clientes',refresh(){}}),/Error real de clientes/);
      assert.match(renderMesa({error:'Error real de clientes',refresh(){}}),/Reintentar/);
    });
    await t.test('abrir otro pedido reutiliza los mismos participantes, no nombres inventados',() => {
      for (const id of ['p1','p2']) {
        globalThis.__visitResources = [{ data:{ id,mesas_id:'m',usuarios_id:'u',clientes_id:null,sesion_mesa_id:'visita',estado:'abierto',items:[] } },{ data:persons },{ data:[] }];
        const html = render(Pedido,{ id,mesas:{ data:[{ id:'m',numero:1 }] },productos:{ data:[] } });
        assert.match(html,/Clientes en la mesa/); assert.match(html,/Carlos/); assert.match(html,/Laura/);
      }
    });
    await t.test('lectura personal muestra total de varios pedidos separado del saldo',() => {
      globalThis.__visitResources = [{ data:consumo }]; const html = render(Consumos,{ persona:persons[0] });
      assert.match(html,/Consumos de <!-- -->Carlos/); assert.match(html,/Poker/); assert.match(html,/Cant. <!-- -->3/); assert.match(html,/310/); assert.match(html,/no representa el saldo pendiente/);
      globalThis.__visitResources = [{ error:'Error real de visita' }]; assert.match(render(Consumos,{ persona:persons[0] }),/Reintentar/);
    });
  } finally { delete globalThis.__visitResources; await server.close(); }
});
