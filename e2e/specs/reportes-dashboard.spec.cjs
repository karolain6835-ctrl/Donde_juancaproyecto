const {test,expect}=require('@playwright/test');

test('Limpieza visual: reportes, Dashboard, pagos y filtros de mesas conservan funcionalidad real',async({page})=>{
 await page.goto('/login');
 await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');
 await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
 await expect(page).toHaveURL(/dashboard/);
 for(const [action,selector] of [
  ['Nueva compra','.compra-drawer'],
  ['Registrar producto','.inventario-drawer'],
  ['Crear usuario','.usuarios-admin-form'],
  ['Cerrar caja','.cierre-real-filtros'],
 ]){
  await page.goto('/dashboard');
  const refresh=page.getByRole('button',{name:'Actualizar datos',exact:true});
  await expect(refresh).toBeVisible();
  expect((await refresh.boundingBox()).width).toBeLessThan(50);
  await page.getByRole('button',{name:action,exact:true}).click();
  await expect(page.locator(selector).first()).toBeVisible();
  if(action!=='Cerrar caja'){
   await page.locator(selector).first().getByRole('button',{name:action==='Nueva compra'?'Cerrar formulario':'Cancelar',exact:true}).click();
   await expect(page.locator(selector)).toHaveCount(0);
  }
 }
 await page.goto('/reportes');
 for(const section of ['Ventas','Inventario','Caja']){
  await page.locator('.reportes-nav').getByRole('button',{name:section,exact:true}).click();
  if(section==='Inventario')await expect(page.locator('.reporte-inventario-kpis')).toBeVisible();
  else await expect(page.locator('.reporte-paginacion')).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/UTC|resúmenes completos|no solo esta página|gráfica de esta página/);
  if(section!=='Inventario')expect(await page.locator('.reporte-paginacion').evaluate(el=>el.parentElement.lastElementChild===el)).toBe(true);
  await expect(page.getByRole('button',{name:'Actualizar datos',exact:true})).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/Consulta los ingresos del período seleccionado|Pagos confirmados durante el período seleccionado|Existencias actuales|Analiza valor, disponibilidad/);
  if(section!=='Inventario'){
   const response=page.waitForResponse(r=>r.url().includes('/api/pagos?')&&r.request().method()==='GET');
   await page.locator('main select').selectOption('mes');
   await response;
   await expect(page.locator('.reporte-paginacion')).toBeVisible();
  }
  await page.screenshot({path:`test-results/reporte-${section}.png`,fullPage:true});
 }
 await page.goto('/caja');
 await expect(page.locator('.pagos-filtros')).toBeVisible();
 await expect(page.locator('.pagos-filtros button')).toHaveCount(0);
 for(const [label,value,param] of [['Estado','verificado','estado'],['Método','Efectivo','metodo_de_pago'],['Mesa','e2e-mesa','mesas_id'],['Desde','2020-01-01','desde'],['Hasta','2030-01-01','hasta']]){
  const control=page.locator('.pagos-filtros').getByLabel(label);
  const actual=label==='Método'?await control.locator('option').filter({hasText:'Efectivo'}).getAttribute('value'):value;
  const response=page.waitForResponse(r=>r.url().includes('/api/pagos?')&&new URL(r.url()).searchParams.get(param)===actual);
  if(label==='Desde'||label==='Hasta')await control.fill(actual);else await control.selectOption(actual);
  await response;
 }
 await expect(page.locator('.caja-kpis')).toBeVisible();
 await page.screenshot({path:'test-results/caja-pagos-limpieza.png',fullPage:true});
 await page.goto('/operacion/mesas');
 await page.locator('.mesa-filters').getByRole('button',{name:'Todas',exact:true}).click();
 await page.getByLabel('Buscar mesa',{exact:true}).fill('77');
 await expect(page.locator('.mesa-card')).toHaveCount(1);
 await page.getByLabel('Buscar mesa',{exact:true}).fill('inexistente');
 await expect(page.getByText('No hay coincidencias.',{exact:true})).toBeVisible();
 await page.getByLabel('Buscar mesa',{exact:true}).fill('');
 await expect(page.locator('.mesa-card')).toHaveCount(1);
 const filters=await page.locator('.mesa-filters button').evaluateAll(els=>els.map(el=>({height:el.getBoundingClientRect().height,top:el.getBoundingClientRect().top})));
 expect(new Set(filters.map(f=>f.height)).size).toBe(1);
 expect(new Set(filters.map(f=>f.top)).size).toBe(1);
 expect((await page.getByRole('button',{name:'Actualizar mesas',exact:true}).boundingBox()).width).toBeLessThan(50);
 await page.screenshot({path:'test-results/mesas-limpieza.png',fullPage:true});
 for(const width of [1440,1024,768]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/dashboard','/reportes']){
   await page.goto(route);
   await expect(page.locator('main h1').first()).toBeVisible();
   await expect(page.locator('main [role="status"]')).toHaveCount(0);
   await page.screenshot({path:`test-results/${route.slice(1)}-${width}.png`,fullPage:true});
   const overflow=await page.locator('main').evaluate(el=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth,items:[...el.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1).slice(0,8).map(e=>e.className)}));
   expect(overflow.scroll,JSON.stringify({route,width,overflow})).toBeLessThanOrEqual(width);
  }
 }
});
