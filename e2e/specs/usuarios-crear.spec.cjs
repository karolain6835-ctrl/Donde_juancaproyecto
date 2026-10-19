const {test,expect}=require('@playwright/test');
const mysql=require('../../backend/node_modules/mysql2/promise');

test('Crear usuario: formulario visible con listado largo, validación, persistencia y permisos',async({page,request,browser})=>{
 expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);
 const c=await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.E2E_DATABASE});
 const ids=Array.from({length:20},(_,i)=>'e2e-crear-lista-'+i);
 const correo='e2e-nuevo-usuario@example.invalid';
 const errors=[],failures=[],posts=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=500)failures.push(r.status());});
 page.on('request',r=>{if(r.url().endsWith('/usuarios/registrar')&&r.method()==='POST')posts.push(r);});
 try{
  for(const [i,id]of ids.entries())await c.execute("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) SELECT ?,?,?,password_hash,'activo',roles_id FROM usuarios WHERE id='e2e-admin'",[id,'Usuario listado '+i,id+'@example.invalid']);
  await page.goto('/login');
  await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');
  await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/administracion');
  await expect(page.getByRole('cell',{name:'Usuario listado 19',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Crear usuario',exact:true}).click();
  const form=page.locator('.usuarios-admin-form'),name=form.getByLabel('Nombre',{exact:true});
  await expect(name).toBeInViewport();
  await expect(name).toBeFocused();
  const submit=form.getByRole('button',{name:'Crear usuario',exact:true});
  await expect(submit).toBeDisabled();
  expect(posts).toHaveLength(0);
  await form.getByRole('button',{name:'Cancelar',exact:true}).click();
  await expect(form).toHaveCount(0);
  await page.getByRole('button',{name:'Crear usuario',exact:true}).click();
  await expect(name).toHaveValue('');
  const fill=async email=>{
   await name.fill('Usuario creado E2E');
   await form.getByLabel('Correo',{exact:true}).fill(email);
   await form.getByRole('combobox',{name:'Rol',exact:true}).selectOption({label:'Mesero'});
   await form.getByLabel('Contraseña',{exact:true}).fill(process.env.E2E_PASSWORD);
   await form.getByLabel('Confirmar contraseña',{exact:true}).fill(process.env.E2E_PASSWORD);
  };
  await fill(correo);
  const created=page.waitForResponse(r=>r.url().endsWith('/usuarios/registrar')&&r.request().method()==='POST');
  await submit.click();
  const response=await created;expect(response.status()).toBe(201);
  const usuario=(await response.json()).usuario;
  expect(usuario.rol).toBe('Mesero');expect(usuario.correo).toBe(correo);
  await expect(form).toHaveCount(0);
  await expect(page.getByRole('cell',{name:correo,exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell',{name:correo,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Crear usuario',exact:true}).click();
  await fill(correo);
  const duplicate=page.waitForResponse(r=>r.url().endsWith('/usuarios/registrar')&&r.request().method()==='POST');
  await submit.click();expect((await duplicate).status()).toBe(409);
  await expect(form.getByRole('alert')).toContainText(/correo/i);
  const [[count]]=await c.execute('SELECT COUNT(*) AS n FROM usuarios WHERE email=?',[correo]);expect(count.n).toBe(1);
  await form.getByRole('button',{name:'Cancelar',exact:true}).click();
  const login=await request.post(process.env.E2E_API_URL+'/usuarios/login',{data:{correo,contrasena:process.env.E2E_PASSWORD}});
  expect(login.status()).toBe(200);
  const token=(await login.json()).token;
  const forbidden=await request.post(process.env.E2E_API_URL+'/usuarios/registrar',{headers:{Authorization:'Bearer '+token},data:{nombre:'No autorizado',correo:'no-autorizado@example.invalid',roles_id:usuario.roles_id,contrasena:process.env.E2E_PASSWORD}});
  expect(forbidden.status()).toBe(403);
  const context=await browser.newContext();
  try{
   const employee=await context.newPage();await employee.goto(process.env.E2E_WEB_URL+'/login');
   await employee.getByPlaceholder('correo@dondejuanca.com').fill(correo);
   await employee.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);
   await employee.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
   await expect(employee).not.toHaveURL(/login/);
   await employee.goto(process.env.E2E_WEB_URL+'/administracion');
   await expect(employee.getByRole('button',{name:'Crear usuario',exact:true})).toHaveCount(0);
  }finally{await context.close();}
  expect(posts).toHaveLength(2);expect(errors).toEqual([]);expect(failures).toEqual([]);
 }finally{
  await c.execute('DELETE FROM usuarios WHERE id IN ('+ids.map(()=>'?').join(',')+')',ids);
  await c.execute('DELETE FROM usuarios WHERE email=?',[correo]);
  await c.end();
 }
});
