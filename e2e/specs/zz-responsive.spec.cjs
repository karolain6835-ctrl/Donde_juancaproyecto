const {test,expect}=require('@playwright/test');
test('Responsive global: módulos reales, menú accesible y búsqueda en cuatro anchos',async({page})=>{
 await page.goto('/login');await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
 for(const width of [1440,1024,768,390]){
  await page.setViewportSize({width,height:844});
  for(const route of ['/dashboard','/operacion/mesas','/operacion/pedidos','/inventario','/compras','/juegos','/caja','/clientes','/reportes','/administracion']){
   await page.goto(route);await expect(page.locator('main h1').first()).toBeVisible();
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
   const overflow=await page.locator('main').evaluate(el=>[...el.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').slice(0,10).map(e=>({cls:e.className,right:e.getBoundingClientRect().right})));
   expect(await page.evaluate(()=>document.documentElement.scrollWidth),JSON.stringify({width,route,overflow})).toBeLessThanOrEqual(width);
   await page.screenshot({path:'test-results/responsive-'+route.replaceAll('/','-')+'-'+width+'.png'});
  }
  if(width<1101){
   const menu=page.locator('.sidebar-toggle');await expect(menu).toHaveAttribute('aria-expanded','false');await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await expect(page.getByRole('button',{name:'Cerrar menú',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(menu).toBeFocused();
   await menu.click();await page.locator('.sidebar').getByRole('link',{name:'Mesas',exact:true}).click();await expect(page).toHaveURL(/operacion\/mesas/);await expect(menu).toHaveAttribute('aria-expanded','false');
   const search=page.getByPlaceholder('Buscar...');await search.fill('inventario');await search.press('Enter');await expect(page).toHaveURL(/inventario/);
  }else await expect(page.locator('.sidebar')).toBeVisible();
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.sidebar-toggle').click();await expect(page.getByRole('button',{name:'Cerrar menú',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>document.querySelector('.sidebar').contains(document.activeElement))).toBe(true);await page.keyboard.press('Escape');await expect(page.locator('.sidebar-toggle')).toBeFocused();
});

test('Móvil real: crear pedido, mesa ocupada, juego y detalles de pago/cierre dentro del viewport',async({page,request})=>{
 expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);
 await page.setViewportSize({width:390,height:844});
 const api=process.env.E2E_API_URL;
 const auth=await request.post(api+'/usuarios/login',{data:{correo:'e2e-admin@example.invalid',contrasena:process.env.E2E_PASSWORD}});const headers={Authorization:'Bearer '+(await auth.json()).token};
 const createdMesa=await request.post(api+'/mesas',{headers,data:{numero:88}});expect(createdMesa.status()).toBe(201);const mesa=(await createdMesa.json()).datos;expect(mesa.estado).toBe('disponible');
 await page.goto('/login');await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
 async function fits(modal){await expect(modal).toBeVisible();const box=await modal.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);expect(box.y+box.height).toBeLessThanOrEqual(844);expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);}
 await page.goto('/operacion/mesas');await page.getByRole('button',{name:'Nuevo pedido',exact:true}).click();let modal=page.getByRole('dialog',{name:'Nuevo pedido',exact:true});await fits(modal);await modal.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(modal).toHaveCount(0);
 await page.getByRole('button',{name:'Nuevo pedido',exact:true}).click();await modal.getByRole('combobox',{name:'Mesa',exact:true}).selectOption(mesa.id);await modal.getByRole('combobox',{name:'Responsable del pedido',exact:true}).selectOption('e2e-admin');await modal.getByLabel('Buscar cliente',{exact:true}).fill('E2E Cliente');await modal.getByRole('button',{name:'Seleccionar a E2E Cliente',exact:true}).click();
 const created=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/pedidos');await modal.getByRole('button',{name:'Crear pedido',exact:true}).click();const response=await created;expect(response.status()).toBe(201);const id=(await response.json()).id_pedido;
 modal=page.getByRole('dialog',{name:'Detalle de pedido',exact:true});await fits(modal);await modal.getByRole('button',{name:'Cerrar detalle',exact:true}).click();await expect(modal).toHaveCount(0);
 const mesas=await (await request.get(api+'/mesas/estado/ocupada',{headers})).json();expect((Array.isArray(mesas)?mesas:mesas.datos).find(m=>m.id===mesa.id).estado).toBe('ocupada');
 await page.goto('/juegos');await page.getByRole('button',{name:'Iniciar juego',exact:true}).first().click();modal=page.getByRole('dialog',{name:'Iniciar juego',exact:true});await fits(modal);await modal.getByRole('combobox',{name:'Mesa',exact:true}).selectOption(mesa.id);await modal.getByRole('combobox',{name:'Pedido abierto',exact:true}).selectOption(id);await modal.getByRole('button',{name:'Iniciar juego',exact:true}).click();await expect(modal).toHaveCount(0);
 await page.getByRole('button',{name:'Sesiones activas',exact:true}).click();await page.getByRole('button',{name:'Finalizar juego',exact:true}).first().click();modal=page.getByRole('dialog',{name:'Finalizar juego',exact:true});await fits(modal);await modal.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(modal).toHaveCount(0);
 const product=await request.post(api+'/productos',{headers,data:{nombre:'Producto responsive',codigo:'E2E-RESP',precio_venta:1000,cantidad:2,stock_minimo:0,categorias_id:1,proveedores_id:'e2e-prov'}});expect(product.status()).toBe(201);const productId=(await product.json()).id_producto;
 expect((await request.post(api+'/pedidos/'+id+'/items',{headers,data:{productos_id:productId,cantidad_pedida:1,precio_unitario:1000}})).status()).toBe(201);
 const paid=await request.post(api+'/pagos',{headers,data:{pedidos_id:id,total_seleccionado:1000,metodo_de_pago:'efectivo'}});expect(paid.status()).toBe(201);const paymentId=(await paid.json()).id_pago;
 expect((await request.patch(api+'/pagos/'+paymentId+'/verificar',{headers,data:{verificacion_estado:'verificado'}})).status()).toBe(200);
 await page.goto('/caja');await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();modal=page.getByRole('dialog',{name:'Detalle del pago',exact:true});await fits(modal);await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
 const now=new Date();const start=new Date(now.getTime()-86400000).toISOString().slice(0,19),end=new Date(now.getTime()+60000).toISOString().slice(0,19);
 const closing=await request.post(api+'/cierres-caja',{headers,data:{fecha_inicio:start,fecha_fin:end,total_efectivo_real:'1000.00'}});expect(closing.status()).toBe(201);
 await page.getByRole('button',{name:'Cierres de caja',exact:true}).click();await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();modal=page.getByRole('dialog',{name:'Detalle de cierre',exact:true});await fits(modal);await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
});
