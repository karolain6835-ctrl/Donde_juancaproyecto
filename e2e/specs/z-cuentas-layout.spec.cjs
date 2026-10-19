const {test,expect}=require('@playwright/test');
test('Cuentas reales: filtros, referencias, acciones y distribución responsive',async({page,request})=>{
 expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);
 const api=process.env.E2E_API_URL;
 const auth=await request.post(api+'/usuarios/login',{data:{correo:'e2e-admin@example.invalid',contrasena:process.env.E2E_PASSWORD}});
 const headers={Authorization:'Bearer '+(await auth.json()).token};
 const product=await request.post(api+'/productos',{headers,data:{nombre:'Producto cuentas',codigo:'E2E-CUENTAS',precio_venta:3500,cantidad:10,stock_minimo:0,categorias_id:1,proveedores_id:'e2e-prov'}});
 expect(product.status()).toBe(201);const productId=(await product.json()).id_producto;
 const ids=[];
 for(let i=0;i<4;i++){
  const client=await request.post(api+'/clientes/registrar',{headers,data:{nombre:i===0?'Cliente cuentas con nombre muy largo para comprobar el espacio de las tarjetas de cuentas pendientes':'Cliente cuentas '+i}});expect(client.status()).toBe(201);
  const clientBody=await client.json();const clientId=clientBody.cliente.id;
  const order=await request.post(api+'/pedidos',{headers,data:{mesas_id:'e2e-mesa',usuarios_id:'e2e-admin',clientes_id:clientId}});expect(order.status()).toBe(201);const id=(await order.json()).id_pedido;ids.push(id);
  expect((await request.post(api+'/pedidos/'+id+'/items',{headers,data:{productos_id:productId,cantidad_pedida:1,precio_unitario:3500}})).status()).toBe(201);
 }
 await page.goto('/login');await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
 await page.goto('/caja');await page.getByRole('button',{name:'Cuentas pendientes',exact:true}).click();
 const section=page.locator('.cuentas-pendientes-section'),cards=section.locator('.cuenta-card');
 await section.getByRole('searchbox').fill('Cliente cuentas');await expect(cards).toHaveCount(4);await expect(section.getByRole('button',{name:'Actualizar cuentas'})).toHaveCount(0);
 for(const [width,columns]of [[1600,4],[1100,2],[750,1]]){
  await page.setViewportSize({width,height:1000});
  await expect.poll(()=>section.locator('.cuentas-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
  const buttons=await cards.getByRole('button',{name:'Pagar',exact:true}).all();await expect(buttons[0]).toBeEnabled();
  if(columns===4){const ys=await Promise.all(buttons.map(async b=>(await b.boundingBox()).y));expect(Math.max(...ys)-Math.min(...ys)).toBeLessThan(2);}
  await page.screenshot({path:'test-results/cuentas-'+width+'.png'});
 }
 const search=section.getByRole('searchbox');await search.fill(ids[0]);await expect(cards).toHaveCount(1);await expect(cards.locator('.cuenta-referencia')).toHaveAttribute('title',ids[0]);await expect(cards.locator('.cuenta-referencia')).toHaveText('Pedido #'+ids[0].slice(0,8));
 await cards.getByRole('button',{name:'Dividir cuenta',exact:true}).click();await expect(page.getByRole('dialog',{name:'Dividir cuenta',exact:true})).toBeVisible();await page.getByRole('button',{name:'Cerrar división',exact:true}).click();await expect(cards).toHaveCount(1);
 await cards.getByRole('button',{name:'Pagar',exact:true}).click();await cards.getByLabel('Valor',{exact:true}).fill('1.000');await cards.getByRole('button',{name:'Registrar pago',exact:true}).click();await expect(cards).toContainText('Pendiente de verificación');await expect(cards).toContainText('2.500');
 await search.clear();await expect.poll(()=>cards.count()).toBeGreaterThanOrEqual(4);await search.fill('Cliente cuentas');await expect(cards).toHaveCount(4);
 await section.getByRole('combobox',{name:'Pedidos',exact:true}).selectOption('cerrado');await expect(cards).toHaveCount(0);await section.getByRole('combobox',{name:'Pedidos',exact:true}).selectOption('abierto');await expect(cards).toHaveCount(4);
});
