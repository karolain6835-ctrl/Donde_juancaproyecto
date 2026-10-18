const {test,expect}=require('@playwright/test');
const sharp=require('../../backend/node_modules/sharp');
test('Imagen opcional real: creación parcial sin duplicados, subida, conservación y eliminación',async({page,request})=>{
  expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);
  await page.goto('/login');await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.goto('/inventario');await page.getByRole('button',{name:'Productos',exact:true}).click();
  await expect(page.getByRole('img',{name:'Sin imagen de E2E Producto',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Nuevo producto',exact:true}).click();
  const form=page.locator('form').filter({has:page.locator('input[name="nombre"]')});
  await page.getByLabel('Nombre',{exact:true}).fill('E2E Imagen');await page.getByLabel('Código',{exact:true}).fill('E2E-IMG');
  await form.getByLabel(/^Precio de venta/).fill('2844,44');
  await form.getByRole('combobox',{name:'Categoría',exact:true}).selectOption('1');await form.getByRole('combobox',{name:'Proveedor',exact:true}).selectOption('e2e-prov');
  const buffer=await sharp({create:{width:30,height:30,channels:3,background:'#d87d25'}}).png().toBuffer();
  await page.getByLabel('Imagen del producto (opcional)',{exact:true}).setInputFiles({name:'producto.png',mimeType:'image/png',buffer});
  // Fallo de red controlado; el alta JSON y todos los reintentos siguen usando API/BD reales.
  await page.route('**/api/productos/*/imagen',route=>route.abort());await page.getByRole('button',{name:'Guardar producto',exact:true}).click();
  await expect(page.getByText(/^El producto se guardó, pero no fue posible actualizar su imagen\./)).toBeVisible();
  await page.unroute('**/api/productos/*/imagen');await page.getByRole('button',{name:'Actualizar producto',exact:true}).click();
  await expect(page.getByRole('row').filter({hasText:'E2E-IMG'}).getByRole('img',{name:'Imagen de E2E Imagen',exact:true})).toBeVisible();
  const login=await request.post(process.env.E2E_API_URL+'/usuarios/login',{data:{correo:'e2e-admin@example.invalid',contrasena:process.env.E2E_PASSWORD}});const headers={Authorization:'Bearer '+(await login.json()).token};
  let list=(await (await request.get(process.env.E2E_API_URL+'/productos',{headers})).json()).datos.filter(p=>p.codigo==='E2E-IMG');expect(list).toHaveLength(1);const saved=list[0].imagen_url;
  const row=page.getByRole('row').filter({hasText:'E2E-IMG'});await row.getByRole('button',{name:'Ver detalle',exact:true}).click();await page.getByRole('button',{name:'Editar producto',exact:true}).click();
  await page.getByRole('button',{name:'Actualizar producto',exact:true}).click();
  list=(await (await request.get(process.env.E2E_API_URL+'/productos',{headers})).json()).datos.filter(p=>p.codigo==='E2E-IMG');expect(list[0].imagen_url).toBe(saved);
  await row.getByRole('button',{name:'Ver detalle',exact:true}).click();await page.getByRole('button',{name:'Editar producto',exact:true}).click();await page.getByRole('button',{name:'Quitar imagen',exact:true}).click();await page.getByRole('button',{name:'Actualizar producto',exact:true}).click();
  await expect(row.getByRole('img',{name:'Sin imagen de E2E Imagen',exact:true})).toBeVisible();
  expect((await request.get(new URL(saved,process.env.E2E_API_URL).href)).status()).toBe(404);
});
