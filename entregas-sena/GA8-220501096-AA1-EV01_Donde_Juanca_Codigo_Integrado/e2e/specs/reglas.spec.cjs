const {test,expect}=require('@playwright/test');const {randomUUID}=require('node:crypto');
const base=process.env.E2E_API_URL;
async function login(request,id='admin',password=process.env.E2E_PASSWORD){const r=await request.post(base+'/usuarios/login',{data:{correo:'e2e-'+id+'@example.invalid',contrasena:password}});expect(r.status()).toBe(200);return (await r.json()).token;}
async function call(request,token,method,url,data,status=200,key){const r=await request.fetch(base+url,{method,data,headers:{Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})}});expect(r.status(),url).toBe(status);return r.json();}
const stock=async(r,t)=>(await call(r,t,'GET','/productos')).datos.find(p=>p.id==='e2e-product').cantidad_disponible;
const order=async(r,t)=>(await call(r,t,'POST','/pedidos',{mesas_id:'e2e-mesa',usuarios_id:'e2e-admin',clientes_id:'e2e-cliente'},201)).id_pedido;
const add=async(r,t,id,qty=1)=>call(r,t,'POST','/pedidos/'+id+'/items',{productos_id:'e2e-product',cantidad_pedida:qty,precio_unitario:2844.44},201);
test.beforeEach(()=>expect(process.env.E2E_DATABASE).toMatch(/^dj_v1_e2e_[a-f0-9]{32}$/));
test('API real: autenticación, permisos, perfil y cambio de contraseña',async({request})=>{
 const invalid=await request.post(base+'/usuarios/login',{data:{correo:'e2e-admin@example.invalid',contrasena:'Incorrecta'}});expect(invalid.status()).toBe(401);
 expect((await request.get(base+'/pedidos')).status()).toBe(401);
 const token=await login(request),bar=await login(request,'bar');await call(request,bar,'GET','/mesas/estado/todas',undefined,403);
 const profile=await call(request,token,'GET','/usuarios/me');expect(profile.usuario.nombre).toBe('E2E Administrador');
 await call(request,token,'PUT','/usuarios/me',{nombre:'E2E Administrador validado',correo:'e2e-admin@example.invalid'});
 expect((await call(request,token,'GET','/usuarios/me')).usuario.nombre).toContain('validado');
 const next=randomUUID();await call(request,token,'PUT','/usuarios/me/password',{contrasena_actual:process.env.E2E_PASSWORD,contrasena_nueva:next,confirmar_contrasena:next});
 expect((await request.post(base+'/usuarios/login',{data:{correo:'e2e-admin@example.invalid',contrasena:process.env.E2E_PASSWORD}})).status()).toBe(401);
 const renewed=await login(request,'admin',next);await call(request,renewed,'PUT','/usuarios/me/password',{contrasena_actual:next,contrasena_nueva:process.env.E2E_PASSWORD,confirmar_contrasena:process.env.E2E_PASSWORD});
 await call(request,renewed,'PUT','/usuarios/me',{nombre:'E2E Administrador',correo:'e2e-admin@example.invalid'});
});
test('API real: pedido reduce stock, cancelar reintegra y pago no lo modifica',async({request})=>{
 const t=await login(request),before=await stock(request,t),p=await order(request,t);
 const item=await add(request,t,p,2);expect(await stock(request,t)).toBe(before-2);
 await call(request,t,'PUT','/pedidos/items/'+item.id_item+'/cancelar');expect(await stock(request,t)).toBe(before);
 await add(request,t,p);
 const payment=await call(request,t,'POST','/pagos',{pedidos_id:p,total_seleccionado:2844.44,metodo_de_pago:'efectivo'},201);expect(payment.estado).toBe('pendiente');expect(await stock(request,t)).toBe(before-1);
 await call(request,t,'PATCH','/pagos/'+payment.id_pago+'/verificar',{verificacion_estado:'verificado'});expect(await stock(request,t)).toBe(before-1);
});
test('API real: ronda idempotente, estado enviado y cancelación',async({request})=>{
 const t=await login(request),p=await order(request,t),before=await stock(request,t);
 const participants=(await call(request,t,'GET','/pedidos/'+p+'/participantes')).datos;
 const body={items:[{participante_id:participants[0].id,productos_id:'e2e-product',cantidad:2}]},key=randomUUID();
 const first=await call(request,t,'POST','/pedidos/'+p+'/rondas',body,201,key);const again=await call(request,t,'POST','/pedidos/'+p+'/rondas',body,200,key);expect(again.datos.id).toBe(first.datos.id);expect(await stock(request,t)).toBe(before-2);
 expect(first.datos.items[0].estado).toBe('enviado');await call(request,t,'PUT','/pedidos/items/'+first.datos.items[0].id+'/cancelar');expect(await stock(request,t)).toBe(before);
});
test('API real: mantenimiento bloquea inicio, sesión activa bloquea mantenimiento y juego no toca stock',async({request})=>{
 const t=await login(request),p=await order(request,t),before=await stock(request,t);
 await call(request,t,'PATCH','/juegos/activos/e2e-game/estado',{estado:'mantenimiento'});
 const body={activos_juego_id:'e2e-game',mesas_id:'e2e-mesa',pedidos_id:p};await call(request,t,'POST','/juegos/iniciar',body,409);
 await call(request,t,'PATCH','/juegos/activos/e2e-game/estado',{estado:'disponible'});
 const game=await call(request,t,'POST','/juegos/iniciar',body,201);expect(game.datos.pedido_items_id).toBeNull();
 await call(request,t,'PATCH','/juegos/activos/e2e-game/estado',{estado:'mantenimiento'},409);
 const end=await call(request,t,'PUT','/juegos/'+game.id_sesion+'/terminar',{});expect(end.datos.estado).toBe('cerrada');expect(await stock(request,t)).toBe(before);
});
test('API real: división vacía/ajena no bloquea; cuotas propias bloquean pago directo',async({request})=>{
 const t=await login(request),a=await order(request,t),b=await order(request,t);await add(request,t,a);await add(request,t,b);
 const person=(await call(request,t,'GET','/pedidos/'+a+'/participantes')).datos[0].id;
 const empty=(await call(request,t,'POST','/sesiones-division',{mesas_id:'e2e-mesa',modalidad:'total'},201)).data.id;
 const foreign=(await call(request,t,'POST','/sesiones-division',{mesas_id:'e2e-mesa',modalidad:'total'},201)).data.id;
 await call(request,t,'POST','/sesiones-division/'+foreign+'/cuotas',{pedido_id:b,jugadores_id:person},201,randomUUID());
 const pending=await call(request,t,'POST','/pagos',{pedidos_id:a,total_seleccionado:100,metodo_de_pago:'efectivo'},201);
 await call(request,t,'PATCH','/pagos/'+pending.id_pago+'/verificar',{verificacion_estado:'rechazado'});
 const own=await call(request,t,'POST','/sesiones-division/'+empty+'/cuotas',{pedido_id:a,jugadores_id:person},201,randomUUID());
 await call(request,t,'POST','/pagos',{pedidos_id:a,total_seleccionado:100,metodo_de_pago:'efectivo'},409);
 await call(request,t,'POST','/pagos',{pedidos_id:a,total_seleccionado:100,metodo_de_pago:'efectivo',sesion_division_id:empty,participante_id:own.data.participantes[0].id},201);
});
test('API real: lecturas administrativas, inventario, historiales y ausencia de endpoints retirados',async({request})=>{
 const t=await login(request);
 for(const route of ['/productos','/categorias','/clientes','/clientes/e2e-cliente/historial','/proveedores','/compras?proveedores_id=e2e-prov','/inventario/alertas?pagina=1&limite=5','/inventario/movimientos?pagina=1&limite=5','/refrigeradores','/juegos/activos','/juegos/sesiones','/usuarios','/configuracion','/auditoria','/pagos','/cierres-caja'])await call(request,t,'GET',route);
 for(const route of ['/kanban/simulado','/ventas/pedido','/usuarios/auth/otp/solicitar']){const r=await request.fetch(base+route,{method:route==='/kanban/simulado'?'GET':'POST',headers:{Authorization:'Bearer '+t},data:{}});expect(r.status()).toBe(404);}
});
