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

test('Sin mocks: imagen opcional persiste en BD/archivo/URL, formatos, reemplazo y eliminación',async({page,request})=>{
 expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/);expect(process.env.DB_NAME).toBe(process.env.E2E_DATABASE);
 const mysql=require('../../backend/node_modules/mysql2/promise'),fs=require('node:fs/promises'),path=require('node:path');
 const db=await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.E2E_DATABASE});
 const api=process.env.E2E_API_URL;
 try{
  const login=await request.post(api+'/usuarios/login',{data:{correo:'e2e-admin@example.invalid',contrasena:process.env.E2E_PASSWORD}});const headers={Authorization:'Bearer '+(await login.json()).token};
  await page.goto('/login');await page.getByPlaceholder('correo@dondejuanca.com').fill('e2e-admin@example.invalid');await page.getByPlaceholder('Ingresa tu contraseña').fill(process.env.E2E_PASSWORD);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.goto('/inventario');await page.getByRole('button',{name:'Productos',exact:true}).click();await page.getByRole('button',{name:'Nuevo producto',exact:true}).click();
  const form=page.locator('form').filter({has:page.locator('input[name="nombre"]')});
  await form.getByLabel('Nombre',{exact:true}).fill('Bebida imagen real');await form.getByLabel('Código',{exact:true}).fill('E2E-IMG-REAL');await form.getByLabel(/^Precio de venta/).fill('2844,44');await form.getByRole('combobox',{name:'Categoría',exact:true}).selectOption('1');await form.getByRole('combobox',{name:'Proveedor',exact:true}).selectOption('e2e-prov');await page.getByRole('button',{name:'Guardar producto',exact:true}).click();
  const row=page.getByRole('row').filter({hasText:'E2E-IMG-REAL'});
  await expect(row.getByRole('img',{name:'Sin imagen de Bebida imagen real',exact:true})).toBeVisible();await expect(row.locator('.lucide-bottle-wine')).toBeVisible();
  const [[product]]=await db.query('SELECT id,imagen_url FROM productos WHERE codigo=?',['E2E-IMG-REAL']);expect(product.imagen_url).toBeNull();
  const read=async()=>{const [[r]]=await db.query('SELECT imagen_url FROM productos WHERE id=?',[product.id]);return r.imagen_url;};
  const edit=async()=>{await row.getByRole('button',{name:'Ver detalle',exact:true}).click();await page.getByRole('button',{name:'Editar producto',exact:true}).click();};
  let previous=null;
  for(const [format,mime,color]of [['jpeg','image/jpeg','#214e3b'],['png','image/png','#d87d25'],['webp','image/webp','#67874c']]){
   await edit();const buffer=await sharp({create:{width:100,height:300,channels:3,background:color}})[format]().toBuffer();
   await page.getByLabel('Imagen del producto (opcional)',{exact:true}).setInputFiles({name:'bebida.'+(format==='jpeg'?'jpg':format),mimeType:mime,buffer});await page.getByRole('button',{name:'Actualizar producto',exact:true}).click();
   const img=row.getByRole('img',{name:'Imagen de Bebida imagen real',exact:true});await expect(img).toBeVisible();await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   await expect.poll(read).not.toBe(previous);const saved=await read();await expect(img).toHaveAttribute('src',new URL(saved,api).href);expect(saved).toMatch(/^\/uploads\/productos\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/);
   const file=path.join(process.env.PRODUCT_IMAGES_DIR,path.basename(saved));const stored=await fs.readFile(file);const metadata=await sharp(stored).metadata();expect(metadata.format).toBe('webp');expect(metadata.width/metadata.height).toBeCloseTo(1/3);
   const served=await request.get(new URL(saved,api).href);expect(served.status()).toBe(200);expect(served.headers()['content-type']).toContain('image/webp');expect(Buffer.compare(await served.body(),stored)).toBe(0);expect(await img.evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain');
   if(previous){expect(saved).not.toBe(previous);await expect(fs.stat(path.join(process.env.PRODUCT_IMAGES_DIR,path.basename(previous)))).rejects.toMatchObject({code:'ENOENT'});expect((await request.get(new URL(previous,api).href)).status()).toBe(404);}
   previous=saved;await page.reload();await expect(row.getByRole('img',{name:'Imagen de Bebida imagen real',exact:true})).toBeVisible();
  }
  await page.screenshot({path:'test-results/producto-imagen-real.png',fullPage:true});
  const wrong=await request.put(api+'/productos/'+product.id+'/imagen',{headers,multipart:{imagen:{name:'falsa.jpg',mimeType:'image/jpeg',buffer:Buffer.from('contenido no válido')}}});expect(wrong.status()).toBe(415);expect((await wrong.json()).error).toMatch(/imagen/i);expect(await read()).toBe(previous);
  const large=Buffer.alloc(5*1024*1024+1);
  const tooLarge=await request.put(api+'/productos/'+product.id+'/imagen',{headers,multipart:{imagen:{name:'grande.png',mimeType:'image/png',buffer:large}}});expect(tooLarge.status()).toBe(413);expect(await read()).toBe(previous);
  await edit();await page.getByLabel('Imagen del producto (opcional)',{exact:true}).setInputFiles({name:'falsa.jpg',mimeType:'image/jpeg',buffer:Buffer.from('no es una imagen')});await expect(page.getByRole('alert').filter({hasText:'La imagen no se puede abrir'})).toBeVisible();expect(await read()).toBe(previous);await page.getByRole('button',{name:'Conservar imagen actual',exact:true}).click();
  await page.getByLabel('Imagen del producto (opcional)',{exact:true}).setInputFiles({name:'grande.png',mimeType:'image/png',buffer:large});await expect(page.getByRole('alert').filter({hasText:'5 MB'})).toBeVisible();await page.getByRole('button',{name:'Conservar imagen actual',exact:true}).click();
  await page.getByRole('button',{name:'Quitar imagen',exact:true}).click();await page.getByRole('button',{name:'Actualizar producto',exact:true}).click();await expect(row.getByRole('img',{name:'Sin imagen de Bebida imagen real',exact:true})).toBeVisible();expect(await read()).toBeNull();
  const finalApi=await (await request.get(api+'/productos',{headers})).json();expect(finalApi.datos.find(p=>p.id===product.id).imagen_url).toBeNull();
  await expect(fs.stat(path.join(process.env.PRODUCT_IMAGES_DIR,path.basename(previous)))).rejects.toMatchObject({code:'ENOENT'});expect((await request.get(new URL(previous,api).href)).status()).toBe(404);await page.reload();await expect(row.locator('.lucide-bottle-wine')).toBeVisible();
 }finally{await db.end();}
 // El runner elimina su esquema y directorio de imágenes aislados incluso si falla la prueba.
});
