const {test,expect}=require('@playwright/test');
test('Pantallas reales, pestañas, búsqueda y notificaciones sin excepciones ni 5xx',async({page})=>{
 expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);
 const pageErrors=[],failures=[];
 page.on('pageerror',e=>pageErrors.push(e.name));
 page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=500)failures.push({ruta:new URL(r.url()).pathname,status:r.status()});});
 await page.goto('/login');await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
 for(const route of ['/dashboard','/operacion/mesas','/operacion/pedidos','/operacion/kanban','/inventario','/compras','/juegos','/caja','/clientes','/reportes','/administracion']){
  await page.goto(route);await expect(page.locator('main h1').first()).toBeVisible();await expect(page.locator('main')).not.toContainText('No tienes permiso');
 }
 await page.goto('/inventario');
 for(const name of ['Productos','Categorías','Refrigeradores','Movimientos','Alertas','Mermas']){await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('main h1').first()).toBeVisible();}
 await page.goto('/compras');await page.getByRole('button',{name:'Proveedores',exact:true}).click();await expect(page.getByText('E2E Proveedor',{exact:true}).first()).toBeVisible();
 await page.goto('/juegos');for(const name of ['Sesiones activas','Historial','Mantenimiento','Juegos disponibles']){await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('main h1')).toBeVisible();}
 await page.getByRole('button',{name:/Notificaciones/}).click();await expect(page.getByRole('heading',{name:'Alertas de inventario',exact:true})).toBeVisible();await expect(page.getByText('E2E Producto',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Ver todas las alertas',exact:true}).click();await expect(page).toHaveURL(/inventario/);await expect(page.locator('main h1')).toContainText('Alertas');
 await page.getByLabel('Buscar en DondeJuanca').fill('AUDITORIA');await page.getByLabel('Buscar en DondeJuanca').press('Enter');await expect(page).toHaveURL(/administracion/);await expect(page.locator('main h1')).toContainText('Auditoría');
 expect(pageErrors).toEqual([]);expect(failures).toEqual([]);
});
