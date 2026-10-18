const {test,expect}=require('@playwright/test');

test('Reportes y Dashboard: recarga compacta y acciones abren los formularios reales',async({page})=>{
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
 for(const section of ['Ventas','Caja']){
  await page.locator('.reportes-nav').getByRole('button',{name:section,exact:true}).click();
  await expect(page.locator('.reporte-paginacion')).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/UTC|resúmenes completos|no solo esta página|gráfica de esta página/);
  expect(await page.locator('.reporte-paginacion').evaluate(el=>el.parentElement.lastElementChild===el)).toBe(true);
  const refresh=page.getByRole('button',{name:'Actualizar datos',exact:true});
  expect((await refresh.boundingBox()).width).toBeLessThan(50);
  await refresh.click();
  await expect(page.locator('.reporte-paginacion')).toBeVisible();
  await page.screenshot({path:`test-results/reporte-${section}.png`,fullPage:true});
 }
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
