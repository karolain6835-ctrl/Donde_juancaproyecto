const {test,expect}=require('@playwright/test');
const mysql=require('../../backend/node_modules/mysql2/promise');

test('Roles y permisos reales: Administrador/SuperAdmin, recarga y tres anchos',async({page})=>{
 expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);
 const {permissions}=await import('../../frontend-app/src/utils/permissions.js');
 const errors=[],failures=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=500)failures.push(new URL(r.url()).pathname);});
 const c=await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.E2E_DATABASE});
 try{
  await c.execute("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) SELECT 'e2e-roles-super','SuperAdmin prueba','e2e-roles-super@example.invalid',u.password_hash,'activo',r.id FROM usuarios u JOIN roles r ON r.nombre='SuperAdmin' WHERE u.id='e2e-admin'");
  for(const correo of ['e2e-admin@example.invalid','e2e-roles-super@example.invalid']){
   await page.goto('/login');
   await page.getByPlaceholder('correo@dondejuanca.com').fill(correo);
   await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);
   await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
   await expect(page).toHaveURL(/dashboard/);
   const response=page.waitForResponse(r=>r.url().endsWith('/usuarios/roles'));
   await page.goto('/administracion');
   const catalog=await response;expect(catalog.status()).toBe(200);
   const roles=(await catalog.json()).datos;expect(roles.length).toBeGreaterThan(0);
   await page.getByRole('button',{name:'Roles y permisos',exact:true}).click();
   const cards=page.locator('.roles-permisos-card');await expect(cards).toHaveCount(roles.length);
   for(const [i,rol]of roles.entries()){
    await expect(cards.nth(i).locator('summary')).toContainText(rol.nombre);
    await cards.nth(i).locator('summary').click();
    const expected=Object.entries(permissions).filter(([,allowed])=>allowed.includes(rol.nombre)).map(([action])=>action);
    expect(await cards.nth(i).locator('code').allTextContents()).toEqual(expected);
   }
   await expect(page.locator('.roles-permisos-section input,.roles-permisos-section select,.roles-permisos-section button')).toHaveCount(0);
   for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:900});
    await cards.first().locator('summary').scrollIntoViewIfNeeded();
    await expect(cards.first().locator('summary')).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
   }
   await page.reload();
   await page.getByRole('button',{name:'Roles y permisos',exact:true}).click();
   await expect(cards).toHaveCount(roles.length);
   expect(await cards.locator('summary').allTextContents()).toEqual(roles.map(rol=>rol.nombre+' ('+Object.values(permissions).filter(allowed=>allowed.includes(rol.nombre)).length+' permisos)'));
  }
  expect(errors).toEqual([]);expect(failures).toEqual([]);
 }finally{await c.execute("DELETE FROM usuarios WHERE id='e2e-roles-super'");await c.end();}
});
