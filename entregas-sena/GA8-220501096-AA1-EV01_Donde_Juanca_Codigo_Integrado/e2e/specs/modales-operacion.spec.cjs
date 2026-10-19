const {test,expect}=require('@playwright/test');

test('Clientes de mesa, juegos y pagos: modales reales, foco, Escape y página estable',async({page,request})=>{
 expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);
 const base=process.env.E2E_API_URL;
 const auth=await request.post(base+'/usuarios/login',{data:{correo:'e2e-admin@example.invalid',contrasena:process.env.E2E_PASSWORD}});
 const headers={Authorization:'Bearer '+(await auth.json()).token};
 await page.goto('/login');await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
 await page.goto('/operacion/mesas');await page.getByRole('button',{name:'Nuevo pedido',exact:true}).click();
 let modal=page.getByRole('dialog',{name:'Nuevo pedido',exact:true});
 await modal.getByRole('combobox',{name:'Mesa',exact:true}).selectOption('e2e-mesa');
 await expect(modal.getByText('No hay clientes asociados a esta mesa.',{exact:true})).toBeVisible();
 await expect(modal.getByRole('combobox',{name:'Cliente de la mesa',exact:true})).toHaveCount(0);
 await expect(modal.getByRole('button',{name:'Elegir cliente de la mesa',exact:true})).toHaveCount(0);
 await modal.locator('.pedido-mesa-clientes-vacio').getByRole('button',{name:'Agregar cliente',exact:true}).click();
 await expect(modal.getByLabel('Buscar cliente',{exact:true})).toBeFocused();
 await modal.getByLabel('Buscar cliente',{exact:true}).fill('E2E Cliente');await modal.getByRole('button',{name:'Seleccionar a E2E Cliente',exact:true}).click();
 await expect(modal.locator('.pedido-client-summary')).toContainText('E2E Cliente');await expect(modal.getByText('No hay clientes asociados a esta mesa.',{exact:true})).toHaveCount(0);
 await modal.getByRole('button',{name:'Cambiar',exact:true}).click();await modal.getByRole('button',{name:'Cancelar',exact:true}).click();
 const createOrder=async()=>{const r=await request.post(base+'/pedidos',{headers,data:{mesas_id:'e2e-mesa',usuarios_id:'e2e-admin',clientes_id:'e2e-cliente'}});expect(r.status()).toBe(201);return (await r.json()).id_pedido;};
 const pedido=await createOrder();
 const people=(await (await request.get(base+'/pedidos/'+pedido+'/participantes',{headers})).json()).datos;
 await page.getByRole('button',{name:'Nuevo pedido',exact:true}).click();modal=page.getByRole('dialog',{name:'Nuevo pedido',exact:true});await modal.getByRole('combobox',{name:'Mesa',exact:true}).selectOption('e2e-mesa');await modal.getByRole('button',{name:'Elegir cliente de la mesa',exact:true}).click();
 await modal.getByRole('combobox',{name:'Cliente de la mesa',exact:true}).selectOption(people[0].id);await expect(modal.locator('.pedido-client-summary')).toContainText('E2E Cliente');await modal.getByRole('button',{name:'Cambiar',exact:true}).click();await modal.getByRole('button',{name:'Cancelar',exact:true}).click();
 await page.goto('/juegos');const start=page.getByRole('button',{name:'Iniciar juego',exact:true});await start.click();
 modal=page.getByRole('dialog',{name:'Iniciar juego',exact:true});await expect(modal.getByRole('button',{name:'Cerrar iniciar juego',exact:true})).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(modal.getByRole('button',{name:'Cancelar',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(modal.getByRole('button',{name:'Cerrar iniciar juego',exact:true})).toBeFocused();
 expect(await modal.evaluate(el=>el.closest('main')===null)).toBe(true);
 await modal.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(start).toBeFocused();await start.click();await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
 await start.click();await modal.getByRole('combobox',{name:'Mesa',exact:true}).selectOption('e2e-mesa');await modal.getByRole('combobox',{name:'Pedido abierto',exact:true}).selectOption(pedido);
 await page.screenshot({path:'test-results/modal-iniciar-juego.png'});
 await modal.getByRole('button',{name:'Iniciar juego',exact:true}).click();await expect(modal).toHaveCount(0);
 await page.getByRole('button',{name:'Sesiones activas',exact:true}).click();await page.getByRole('button',{name:'Finalizar juego',exact:true}).click();await page.getByRole('dialog',{name:'Finalizar juego',exact:true}).getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 const productResult=await request.post(base+'/productos',{headers,data:{nombre:'Producto modal pagos',codigo:'E2E-MODAL',precio_venta:1000,cantidad:4,stock_minimo:0,categorias_id:1,proveedores_id:'e2e-prov'}});expect(productResult.status()).toBe(201);const product=(await productResult.json()).id_producto;
 for(const method of ['efectivo','nequi']){
  const id=await createOrder();expect((await request.post(base+'/pedidos/'+id+'/items',{headers,data:{productos_id:product,cantidad_pedida:1,precio_unitario:1000}})).status()).toBe(201);
  expect((await request.post(base+'/pagos',{headers,data:{pedidos_id:id,total_seleccionado:1000,metodo_de_pago:method}})).status()).toBe(201);
 }
 await page.goto('/caja');const table=page.locator('.caja-table');await expect(table).toBeVisible();
 for(const method of ['Efectivo','Nequi']){
  const button=table.getByRole('row').filter({hasText:method}).getByRole('button',{name:'Ver detalle',exact:true});await button.scrollIntoViewIfNeeded();const position=(await table.boundingBox()).y;await button.click();modal=page.getByRole('dialog',{name:'Detalle del pago',exact:true});await expect(modal.locator('.pagos-detalle')).toContainText(method);
  expect(await modal.evaluate(el=>el.closest('main')===null)).toBe(true);expect((await table.boundingBox()).y).toBe(position);
  await page.screenshot({path:`test-results/modal-pago-${method}.png`});await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);await expect(button).toBeFocused();
 }
});
