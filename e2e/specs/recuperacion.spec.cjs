const {test, expect} = require('@playwright/test');
const {randomBytes} = require('node:crypto');
const fs = require('node:fs');
const {leer} = require('../correo-test-buzon.cjs');

test('Recuperación por correo de prueba: UI completa, OTP incorrecto, nueva contraseña y login real', async ({page,request}) => {
  expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);
  const email='e2e-admin@example.invalid',next=randomBytes(18).toString('hex');
  await page.goto('/login');await page.getByRole('button',{name:'¿Olvidaste tu contraseña?',exact:true}).click();
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email);
  await page.getByRole('button',{name:'Enviar código',exact:true}).click();
  await expect(page.getByLabel('Código de recuperación',{exact:true})).toBeVisible();
  await expect.poll(()=>fs.existsSync(process.env.E2E_MAIL_FILE)&&leer(process.env.E2E_MAIL_FILE).some(m=>m.to===email)).toBeTruthy();
  const messages=leer(process.env.E2E_MAIL_FILE);
  const message=messages.filter(m=>m.to===email).at(-1),code=message.text.match(/es: (\d{6})/)[1];
  await page.getByLabel('Código de recuperación',{exact:true}).fill(code==='000000'?'111111':'000000');
  await page.getByRole('button',{name:'Verificar código',exact:true}).click();await expect(page.getByRole('alert')).toContainText('no es válido o expiró');
  await page.getByLabel('Código de recuperación',{exact:true}).fill(code);await page.getByRole('button',{name:'Verificar código',exact:true}).click();
  await expect(page.getByLabel('Nueva contraseña',{exact:true})).toHaveAttribute('type','password');
  await page.getByLabel('Nueva contraseña',{exact:true}).fill(next);await page.getByLabel('Confirmar nueva contraseña',{exact:true}).fill(next);
  await page.getByRole('button',{name:'Guardar contraseña',exact:true}).click();await expect(page.getByRole('status')).toContainText('Contraseña actualizada correctamente.');
  expect((await request.post(process.env.E2E_API_URL+'/usuarios/login',{data:{correo:email,contrasena:process.env.E2E_PASSWORD}})).status()).toBe(401);
  await page.getByRole('button',{name:'Volver a iniciar sesión',exact:true}).click();
  await page.getByPlaceholder('correo@dondejuanca.com').fill(email);await page.getByPlaceholder('Ingresa tu contraseña').fill(next);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  const login=await request.post(process.env.E2E_API_URL+'/usuarios/login',{data:{correo:email,contrasena:next}});expect(login.status()).toBe(200);
  const token=(await login.json()).token;
  const restore=await request.put(process.env.E2E_API_URL+'/usuarios/me/password',{headers:{Authorization:'Bearer '+token},data:{contrasena_actual:next,contrasena_nueva:process.env.E2E_PASSWORD,confirmar_contrasena:process.env.E2E_PASSWORD}});expect(restore.status()).toBe(200);
});
