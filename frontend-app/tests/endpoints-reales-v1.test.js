import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
test('Frontend V1 no consume endpoints heredados ni permiso ficticio',async()=>{
 async function revisar(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const url=new URL(entry.name+(entry.isDirectory()?'/':''),dir);if(entry.isDirectory())await revisar(url);else if(/\.(jsx?|tsx?)$/.test(entry.name)){const s=await readFile(url,'utf8');assert.doesNotMatch(s,/kanban\/simulado|ventas\/pedido|ventas\.crearPedido|PED-999/,entry.name);}}}
 await revisar(new URL('../src/',import.meta.url));
 const pedidos=await readFile(new URL('../src/services/pedidosService.js',import.meta.url),'utf8');assert.match(pedidos,/apiClient\('\/pedidos', \{ method: 'POST'/);
 const kanban=await readFile(new URL('../src/services/kanbanService.js',import.meta.url),'utf8');assert.match(kanban,/\/kanban\/pedidos/);assert.match(kanban,/\/kanban\/tablero/);
});
