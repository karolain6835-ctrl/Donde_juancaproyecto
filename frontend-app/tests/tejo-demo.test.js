import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium,expect} from '../../e2e/node_modules/@playwright/test/index.mjs';
import {crearEstadoTejoDemo,tejoDemoReducer} from '../src/hooks/useTejoDemo.js';

test('Reducer Tejo: selección obligatoria, incrementos, equipos, eventos, rondas, vistas y restablecimiento',()=>{
 let state=crearEstadoTejoDemo();
 assert.equal(tejoDemoReducer(state,{type:'sumar',puntos:3}),state);
 assert.equal(tejoDemoReducer(state,{type:'seleccionar',id:'cliente-real'}),state);
 state=tejoDemoReducer(state,{type:'seleccionar',id:'demo-karol'});
 for(const puntos of [1,3,6,9])state=tejoDemoReducer(state,{type:'sumar',puntos});
 assert.equal(state.jugadores[0].puntaje,19);
 assert.deepEqual(state.ultimaJugada,{id:'tejo-demo-4',jugador:'Karol',jugadorId:'demo-karol',equipo:'a',ronda:1,puntos:9,origen:'simulado'});
 assert.equal(new Set(state.historial.map(e=>e.id)).size,4);
 for(const puntos of [0,-1,2,1.5,'3'])assert.equal(tejoDemoReducer(state,{type:'sumar',puntos}),state);
 const before=JSON.stringify(state);
 const siguiente=tejoDemoReducer(state,{type:'nuevaRonda'});
 assert.equal(siguiente.ronda,2);assert.deepEqual(siguiente.jugadores,state.jugadores);assert.deepEqual(siguiente.historial,state.historial);assert.deepEqual(siguiente.ultimaJugada,state.ultimaJugada);
 state=tejoDemoReducer(siguiente,{type:'seleccionar',id:'demo-diana'});state=tejoDemoReducer(state,{type:'sumar',puntos:6});
 assert.equal(state.ultimaJugada.ronda,2);assert.equal(state.ultimaJugada.equipo,'b');
 const cancha=tejoDemoReducer(state,{type:'vista',vista:'cancha'});
 assert.equal(cancha.vista,'cancha');assert.equal(cancha.jugadores,state.jugadores);
 assert.deepEqual(tejoDemoReducer(cancha,{type:'vista',vista:'control'}),state);
 assert.equal(tejoDemoReducer(state,{type:'vista',vista:'otra-aplicacion'}),state);
 assert.deepEqual(tejoDemoReducer(state,{type:'restablecer'}),crearEstadoTejoDemo());
 assert.equal(JSON.parse(before).jugadores[0].puntaje,19);
 assert.equal(crearEstadoTejoDemo().jugadores[0].puntaje,0,'Los estados nuevos no comparten jugadores mutables');
});

test('Marcador Tejo en Chromium: control, cancha, móvil, salida y recarga sin escrituras ni consultas de participantes', {timeout:60000},async()=>{
 const root=fileURLToPath(new URL('..',import.meta.url));
 const entry=`${root.replaceAll('\\','/').replace(/\/$/,'')}/__tejo-demo-test.jsx`;
 const server=await createServer({root,server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{
  name:'tejo-demo-browser-fixture',
  configureServer(vite){vite.middlewares.use('/__tejo-test',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<html lang="es"><head><meta charset="UTF-8"></head><body><div id="root"></div><script type="module" src="/__tejo-demo-test.jsx"></script></body></html>');});},
  resolveId(id){if(id.endsWith('/__tejo-demo-test.jsx'))return entry;},
  load(id){if(id===entry)return `import React from 'react';import {createRoot} from 'react-dom/client';
   import {AuthContext} from '/src/context/useAuth.js';import JuegosPage from '/src/pages/JuegosPage.jsx';
   import '/src/index.css';import '/src/pages/MesasPage.css';
   createRoot(document.getElementById('root')).render(<AuthContext.Provider value={{user:{id:'admin',rol:'Administrador'}}}><main style={{padding:24}}><JuegosPage/></main></AuthContext.Provider>);`;},
 }]});
 let browser;
 const reales={
  activos:[{id:'tejo-real',nombre:'Cancha real',tipo:'tejo',estado:'ocupado',precio_hora:'3600.00'}],
  sesiones:[{id:'sesion-real',tipo_juego:'tejo',activos_juego_id:'tejo-real',mesas_id:'mesa-real',pedidos_id:'pedido-real',pedido_items_id:null,estado:'activa',tarifa_hora_aplicada:'3600.00',costo_total:null}],
  mesas:[{id:'mesa-real',numero:7,estado:'ocupada'}],pedidos:[{id:'pedido-real',estado:'abierto'}],clientes:[{id:'cliente-real',nombre:'Cliente real'}],rondas:[{id:'ronda-real',numero_ronda:2}],
 };
 const snapshot=JSON.stringify(reales),requests=[];
 try{
  await server.listen();browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:960}});
  await page.route('**/api/**',async route=>{
   const req=route.request(),pathname=new URL(req.url()).pathname;
   requests.push({method:req.method(),pathname});
   const datos=pathname.endsWith('/juegos/activos')?reales.activos:pathname.endsWith('/juegos/sesiones')?reales.sesiones:pathname.endsWith('/mesas/estado/ocupada')?reales.mesas:[];
   await route.fulfill({status:req.method()==='GET'?200:405,contentType:'application/json',body:JSON.stringify({datos})});
  });
  const url=`http://127.0.0.1:${server.httpServer.address().port}/__tejo-test`;
  await page.goto(url);await expect(page.getByRole('heading',{name:'Cancha real'})).toBeVisible();
  await expect.poll(()=>requests.length).toBe(5);
  const baseline=requests.length;
  const entrar=()=>page.getByRole('button',{name:'MODO DEMOSTRACIÓN · Marcador inteligente',exact:true}).click();
  await entrar();
  await expect(page.getByText('Simulación visual · Sin cámaras ni sensores · Los puntajes no se guardan',{exact:true})).toBeVisible();
  await expect(page.getByText('Referencias simuladas',{exact:true})).toBeVisible();
  for(const action of ['Iniciar juego','Finalizar juego','Cobrar juego','Asociar pedido','Editar tarifa'])await expect(page.getByRole('button',{name:action,exact:true})).toHaveCount(0);
  for(const puntos of [1,3,6,9])await expect(page.getByRole('button',{name:String(puntos),exact:true})).toBeDisabled();
  await page.getByLabel('Jugador seleccionado').selectOption('demo-karol');
  for(const puntos of [1,3,6,9])await page.getByRole('button',{name:String(puntos),exact:true}).click();
  await expect(page.getByText('Karol · +9 puntos',{exact:true})).toBeVisible();
  await page.getByLabel('Jugador seleccionado').selectOption('demo-juan');await page.getByRole('button',{name:'3',exact:true}).click();
  await page.getByLabel('Jugador seleccionado').selectOption('demo-diana');await page.getByRole('button',{name:'6',exact:true}).click();
  await page.getByLabel('Jugador seleccionado').selectOption('demo-carlos');await page.getByRole('button',{name:'9',exact:true}).click();
  const equipoA=page.getByRole('article',{name:'Equipo A'}),equipoB=page.getByRole('article',{name:'Equipo B'});
  await expect(equipoA.locator('header strong')).toHaveText('22');await expect(equipoB.locator('header strong')).toHaveText('15');
  await expect(equipoA.locator('li').filter({hasText:'Karol'}).locator('strong')).toHaveText('19');
  await page.getByRole('button',{name:'Nueva ronda',exact:true}).click();await expect(page.getByText('Ronda 2',{exact:true})).toBeVisible();
  await expect(equipoA.locator('header strong')).toHaveText('22');await expect(equipoB.locator('header strong')).toHaveText('15');
  const desktop=await page.locator('.tejo-demo-equipo').evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,left:n.getBoundingClientRect().left})));
  assert.equal(desktop[0].top,desktop[1].top);assert.ok(desktop[0].left<desktop[1].left);
  if(process.env.TEJO_SCREENSHOTS==='1')await page.screenshot({path:fileURLToPath(new URL('../../tejo-demo-desktop.png',import.meta.url)),fullPage:true});
  await page.getByRole('button',{name:'Pantalla de cancha',exact:true}).click();
  const cancha=page.getByRole('region',{name:'Pantalla de cancha simulada'});
  await expect(cancha.getByText('22',{exact:true})).toBeVisible();await expect(cancha.getByText('15',{exact:true})).toBeVisible();
  await expect(cancha.getByText('Ronda 2',{exact:true})).toBeVisible();await expect(cancha.getByText('Carlos +9',{exact:true})).toBeVisible();
  if(process.env.TEJO_SCREENSHOTS==='1')await page.screenshot({path:fileURLToPath(new URL('../../tejo-cancha-desktop.png',import.meta.url)),fullPage:true});
  await page.setViewportSize({width:375,height:812});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.TEJO_SCREENSHOTS==='1')await page.screenshot({path:fileURLToPath(new URL('../../tejo-cancha-mobile.png',import.meta.url)),fullPage:true});
  await page.getByRole('button',{name:'Volver al control'}).click();
  await expect(page.getByLabel('Jugador seleccionado')).toHaveValue('demo-carlos');
  await expect(equipoA.locator('header strong')).toHaveText('22');await expect(equipoB.locator('header strong')).toHaveText('15');
  const mobile=await page.locator('.tejo-demo-equipo').evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,left:n.getBoundingClientRect().left})));
  assert.equal(mobile[0].left,mobile[1].left);assert.ok(mobile[0].top<mobile[1].top);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.TEJO_SCREENSHOTS==='1')await page.screenshot({path:fileURLToPath(new URL('../../tejo-demo-mobile.png',import.meta.url)),fullPage:true});
  await page.getByRole('button',{name:'Restablecer marcador'}).click();
  await expect(equipoA.locator('header strong')).toHaveText('0');await expect(equipoB.locator('header strong')).toHaveText('0');
  await expect(page.getByText('Ronda 1',{exact:true})).toBeVisible();await expect(page.getByText('Sin jugadas todavía',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Jugador seleccionado')).toHaveValue('');
  await page.getByLabel('Jugador seleccionado').selectOption('demo-karol');await page.getByRole('button',{name:'6',exact:true}).click();
  await page.getByRole('button',{name:'Salir del modo demo'}).click();await expect(page.getByRole('heading',{name:'Cancha real'})).toBeVisible();
  await entrar();await expect(equipoA.locator('header strong')).toHaveText('0');
  await page.getByLabel('Jugador seleccionado').selectOption('demo-karol');await page.getByRole('button',{name:'9',exact:true}).click();
  assert.equal(requests.length,baseline,'Ninguna interacción del marcador debe hacer peticiones HTTP');
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,search:location.search,hash:location.hash})),{local:0,session:0,search:'',hash:''});
  assert.equal(page.url(),url);
  await page.reload();await expect(page.getByRole('heading',{name:'Cancha real'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Cancha de Tejo 1 · Mesa 4'})).toHaveCount(0);
  await entrar();await expect(equipoA.locator('header strong')).toHaveText('0');await expect(page.getByText('Sin jugadas todavía',{exact:true})).toBeVisible();
  assert.ok(requests.every(r=>r.method==='GET'));
  assert.ok(requests.every(r=>r.pathname.includes('/juegos/')||r.pathname.includes('/mesas/estado/')),'No se consultan pedidos, clientes ni rondas');
  assert.equal(JSON.stringify(reales),snapshot,'Sesiones, pedidos, clientes, mesas y rondas permanecen intactos');
 }finally{if(browser)await browser.close();await server.close();}
});
