import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium,expect} from '../../e2e/node_modules/@playwright/test/index.mjs';

test('Demo IoT real en Chromium: ocho escenarios, reinicio, salida, recarga y cero peticiones al simular', {timeout:60000}, async () => {
 const root=fileURLToPath(new URL('..',import.meta.url));
 const entry=`${root.replaceAll('\\','/').replace(/\/$/,'')}/__refrigerador-demo-test.jsx`;
 const server=await createServer({root,server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{
  name:'refrigerador-demo-browser-fixture',
  configureServer(vite){vite.middlewares.use('/__demo-test',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<html lang="es"><head><meta charset="UTF-8"></head><body><div id="root"></div><script type="module" src="/__refrigerador-demo-test.jsx"></script></body></html>');});},
  resolveId(id){if(id.endsWith('/__refrigerador-demo-test.jsx'))return entry;},
  load(id){if(id===entry)return `import React from 'react';
   import {createRoot} from 'react-dom/client';
   import {AuthContext} from '/src/context/useAuth.js';
   import RefrigeradoresSection from '/src/components/RefrigeradoresSection.jsx';
   import '/src/index.css';
   import '/src/pages/InventarioPage.css';
   import '/src/pages/MesasPage.css';
   createRoot(document.getElementById('root')).render(<AuthContext.Provider value={{user:{id:'admin',rol:'Administrador'}}}><main style={{padding:24}}><RefrigeradoresSection/></main></AuthContext.Provider>);`;},
 }]});
 let browser;
 const requests=[],row={id:'real',nombre:'Equipo real',ubicacion:'Barra',estado:'activa'};
 try{
  await server.listen();browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.route('**/api/**',async route=>{
   requests.push({method:route.request().method(),url:route.request().url()});
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({datos:[row],total:1})});
  });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__demo-test`);
  await expect(page.getByRole('heading',{name:'Equipo real'})).toBeVisible();
  assert.equal(requests.length,1);assert.equal(requests[0].method,'GET');
  const baseline=requests.length;
  await page.getByRole('button',{name:'Modo demostración IoT',exact:true}).click();
  await expect(page.getByText('MODO DEMOSTRACIÓN · IoT simulado',{exact:true})).toBeVisible();
  await expect(page.getByText('Datos temporales · Sin sensores · No se guardan',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Refrigerador DEMO'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Crear refrigerador'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Guardar cambios'})).toHaveCount(0);
  const controles=[['Temperatura','Normal','Alta','Temperatura fuera del rango esperado'],['Puerta','Cerrada','Abierta','Puerta abierta por demasiado tiempo'],['Stock','Normal','Bajo','Stock bajo de bebidas']];
  for(let escenario=0;escenario<8;escenario++){
   let alertas=0;
   for(let index=0;index<controles.length;index++){
    const [nombre,normal,incidencia]=controles[index],activo=Boolean(escenario&(1<<index));
    await page.getByRole('group',{name:nombre,exact:true}).getByRole('button',{name:activo?incidencia:normal,exact:true}).click();
    await expect(page.getByRole('group',{name:nombre,exact:true}).getByRole('button',{name:activo?incidencia:normal,exact:true})).toHaveAttribute('aria-pressed','true');
   }
   for(let index=0;index<controles.length;index++){
    const activo=Boolean(escenario&(1<<index));if(activo)alertas++;
    await expect(page.getByText(controles[index][3],{exact:true})).toHaveCount(activo?1:0);
   }
   await expect(page.getByText('Alerta simulada',{exact:true})).toHaveCount(alertas);
   await expect(page.getByText('Sin incidencias en este escenario',{exact:true})).toHaveCount(alertas?0:1);
   await expect(page.getByText(escenario&1?'11 °C':'4 °C',{exact:true})).toBeVisible();
   await expect(page.getByText(escenario&4?'4 unidades':'20 unidades',{exact:true})).toBeVisible();
   assert.equal(requests.length,baseline,'Cambiar escenarios no debe consultar ni escribir en la API');
  }
  const indicadores=page.locator('.refrigerador-demo-metric');
  const desktop=await indicadores.evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,left:n.getBoundingClientRect().left})));
  assert.equal(desktop[0].top,desktop[1].top);assert.equal(desktop[1].top,desktop[2].top);
  assert.ok(desktop[0].left<desktop[1].left&&desktop[1].left<desktop[2].left);
  if(process.env.DEMO_SCREENSHOTS==='1')await page.screenshot({path:fileURLToPath(new URL('../../demo-iot-desktop.png',import.meta.url)),fullPage:true});
  await page.setViewportSize({width:375,height:812});
  const mobile=await indicadores.evaluateAll(nodes=>nodes.map(n=>({top:n.getBoundingClientRect().top,left:n.getBoundingClientRect().left})));
  assert.equal(mobile[0].left,mobile[1].left);assert.ok(mobile[0].top<mobile[1].top&&mobile[1].top<mobile[2].top);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.DEMO_SCREENSHOTS==='1')await page.screenshot({path:fileURLToPath(new URL('../../demo-iot-mobile.png',import.meta.url)),fullPage:true});
  await page.getByRole('button',{name:'Restablecer simulación'}).click();
  await expect(page.getByText('Sin incidencias en este escenario',{exact:true})).toBeVisible();
  await expect(page.getByText('4 °C',{exact:true})).toBeVisible();await expect(page.getByText('20 unidades',{exact:true})).toBeVisible();
  await page.getByRole('group',{name:'Puerta',exact:true}).getByRole('button',{name:'Abierta',exact:true}).click();
  await page.getByRole('button',{name:'Salir del modo demo'}).click();
  await expect(page.getByRole('heading',{name:'Equipo real'})).toBeVisible();
  await page.getByRole('button',{name:'Modo demostración IoT',exact:true}).click();
  await expect(page.getByText('Sin incidencias en este escenario',{exact:true})).toBeVisible();
  assert.equal(requests.length,baseline,'Entrar, restablecer y salir tampoco deben disparar peticiones');
  await page.getByRole('group',{name:'Temperatura',exact:true}).getByRole('button',{name:'Alta',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
  await page.reload();
  await expect(page.getByRole('heading',{name:'Equipo real'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Refrigerador DEMO'})).toHaveCount(0);
  await page.getByRole('button',{name:'Modo demostración IoT',exact:true}).click();
  await expect(page.getByText('Sin incidencias en este escenario',{exact:true})).toBeVisible();
  assert.ok(requests.every(r=>r.method==='GET'),'Nunca debe haber POST, PUT, PATCH ni DELETE');
  assert.deepEqual(row,{id:'real',nombre:'Equipo real',ubicacion:'Barra',estado:'activa'});
 }finally{if(browser)await browser.close();await server.close();}
});
