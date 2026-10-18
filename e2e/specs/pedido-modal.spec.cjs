const {test,expect}=require('@playwright/test');

test('Nuevo pedido: modal compacto, búsqueda y paginación reales, selección, cancelación y creación',async({page,request})=>{
 expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);
 const login=await request.post(process.env.E2E_API_URL+'/usuarios/login',{data:{correo:'e2e-admin@example.invalid',contrasena:process.env.E2E_PASSWORD}});
 const headers={Authorization:'Bearer '+(await login.json()).token};
 for(let i=0;i<24;i++){
  const r=await request.post(process.env.E2E_API_URL+'/clientes/registrar',{headers,data:{nombre:'Cliente modal '+String(i).padStart(2,'0')}});
  expect(r.status()).toBe(201);
 }
 await page.goto('/login');await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
 await page.goto('/operacion/mesas');await page.getByRole('button',{name:'Nuevo pedido',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'Nuevo pedido',exact:true});
 await modal.getByRole('combobox',{name:'Mesa',exact:true}).selectOption('e2e-mesa');
 await modal.getByRole('combobox',{name:'Responsable del pedido',exact:true}).selectOption('e2e-admin');
 await expect(modal.locator('.pedido-client-results li').first()).toBeVisible();
 await modal.getByRole('button',{name:'Siguiente',exact:true}).click();
 await expect(modal.locator('.pedido-client-pagination')).toContainText('Página 2');
 await modal.getByRole('button',{name:'Anterior',exact:true}).click();
 await modal.getByLabel('Buscar cliente',{exact:true}).fill('E2E Cliente');
 await modal.getByRole('button',{name:'Seleccionar a E2E Cliente',exact:true}).click();
 await expect(modal.locator('.pedido-client-summary')).toContainText('E2E Cliente');
 await expect(modal.getByLabel('Buscar cliente',{exact:true})).toHaveCount(0);
 await modal.getByRole('button',{name:'Cambiar',exact:true}).click();
 await expect(modal.getByLabel('Buscar cliente',{exact:true})).toBeVisible();
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:800});
  await modal.locator('.pedido-create-body').evaluate(el=>el.scrollTop=el.scrollHeight);
  await expect(modal.getByRole('button',{name:'Crear pedido',exact:true})).toBeVisible();
  const geometry=await modal.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,overflow:el.scrollWidth>el.clientWidth};});
  expect(geometry.left).toBeGreaterThanOrEqual(0);expect(geometry.right).toBeLessThanOrEqual(width);expect(geometry.bottom).toBeLessThanOrEqual(800);expect(geometry.overflow).toBe(false);
  await page.screenshot({path:`test-results/nuevo-pedido-${width}.png`,fullPage:false});
 }
 await modal.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(modal).toHaveCount(0);
 await page.setViewportSize({width:1440,height:900});
 await page.getByRole('button',{name:'Nuevo pedido',exact:true}).click();
 await modal.getByRole('combobox',{name:'Mesa',exact:true}).selectOption('e2e-mesa');
 await modal.getByRole('combobox',{name:'Responsable del pedido',exact:true}).selectOption('e2e-admin');
 await modal.getByLabel('Buscar cliente',{exact:true}).fill('E2E Cliente');
 await modal.getByRole('button',{name:'Seleccionar a E2E Cliente',exact:true}).click();
 const saved=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/pedidos');
 await modal.getByRole('button',{name:'Crear pedido',exact:true}).click();expect((await saved).status()).toBe(201);
 await expect(page).toHaveURL(/operacion\/pedidos\?pedido=/);
});
