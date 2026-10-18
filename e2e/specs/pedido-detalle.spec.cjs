const {test,expect}=require('@playwright/test');
const sharp=require('../../backend/node_modules/sharp');

test('Detalle real: lista, miniaturas, consumos, ronda, agregar y cancelar sin cambiar reglas',async({page,request})=>{
 expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);
 const api=process.env.E2E_API_URL;
 const auth=await request.post(api+'/usuarios/login',{data:{correo:'e2e-admin@example.invalid',contrasena:process.env.E2E_PASSWORD}});
 const headers={Authorization:'Bearer '+(await auth.json()).token};
 const created=await request.post(api+'/productos',{headers,data:{nombre:'Producto con foto detalle',codigo:'E2E-DETAIL',precio_venta:3500,cantidad:5,stock_minimo:0,categorias_id:1,proveedores_id:'e2e-prov'}});expect(created.status()).toBe(201);
 const product=(await created.json()).id_producto;
 const buffer=await sharp({create:{width:30,height:30,channels:3,background:'#da7b25'}}).png().toBuffer();
 expect((await request.put(api+'/productos/'+product+'/imagen',{headers,multipart:{imagen:{name:'producto.png',mimeType:'image/png',buffer}}})).status()).toBe(200);
 const order=await request.post(api+'/pedidos',{headers,data:{mesas_id:'e2e-mesa',usuarios_id:'e2e-admin',clientes_id:'e2e-cliente'}});expect(order.status()).toBe(201);const id=(await order.json()).id_pedido;
 const people=(await (await request.get(api+'/pedidos/'+id+'/participantes',{headers})).json()).datos;
 for(const [productos_id,cantidad_pedida,precio_unitario]of [['e2e-product',2,2844.44],[product,1,3500]])expect((await request.post(api+'/pedidos/'+id+'/items',{headers,data:{productos_id,cantidad_pedida,precio_unitario,participante_id:people[0].id}})).status()).toBe(201);
 await page.goto('/login');await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
 await page.goto('/operacion/pedidos?pedido='+id);
 const modal=page.getByRole('dialog',{name:'Detalle de pedido',exact:true});
 await expect(modal.locator('.pedido-detail-line')).toHaveCount(2);
 await expect(modal.getByRole('img',{name:'Imagen de Producto con foto detalle',exact:true})).toBeVisible();
 await expect(modal.getByRole('img',{name:'Sin imagen de E2E Producto',exact:true})).toBeVisible();
 await expect(modal.locator('.pedido-products-total')).toContainText(/9\.188,88/);
 await expect(modal.locator('.pedido-line-person').first()).toContainText('E2E Cliente');
 await modal.getByRole('button',{name:'Ver consumos',exact:true}).first().click();await expect(modal.getByRole('heading',{name:'Consumos de E2E Cliente',exact:true})).toBeVisible();await modal.getByRole('button',{name:'Cerrar consumos',exact:true}).click();
 await modal.getByRole('button',{name:'Ronda',exact:true}).click();await expect(modal.locator('.ronda-borrador')).toBeVisible();await modal.locator('.ronda-borrador').getByRole('button',{name:'Cancelar',exact:true}).click();
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});await modal.locator('.pedido-detail-body').evaluate(el=>el.scrollTop=0);
  expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:`test-results/pedido-detalle-${width}.png`,fullPage:false});
 }
 const form=modal.locator('.pedido-add-form');await form.getByRole('combobox',{name:'Cliente',exact:true}).selectOption(people[0].id);await form.getByRole('combobox',{name:'Producto',exact:true}).selectOption(product);await form.getByLabel('Cantidad',{exact:true}).fill('1');await form.getByRole('button',{name:'Agregar producto',exact:true}).click();
 await expect(modal.getByRole('status').filter({hasText:'Producto agregado'})).toBeVisible();await expect(modal.locator('.pedido-detail-line')).toHaveCount(2);
 await modal.locator('.pedido-products-table').getByRole('button',{name:'Cancelar producto',exact:true}).first().click();await modal.getByRole('button',{name:'Confirmar cancelación',exact:true}).click();await expect(modal.getByRole('status').filter({hasText:'Producto cancelado'})).toBeVisible();
 const detail=(await (await request.get(api+'/pedidos/'+id,{headers})).json()).datos;
 for(const item of detail.items.filter(i=>['enviado','preparando'].includes(i.estado)))expect((await request.put(api+'/pedidos/items/'+item.id+'/cancelar',{headers})).status()).toBe(200);
 await modal.getByRole('button',{name:'Cerrar detalle',exact:true}).click();await expect(modal).toHaveCount(0);
});
