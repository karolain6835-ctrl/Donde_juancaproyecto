import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {listarUsuariosAdmin,listarRolesUsuarios,usuarioAdminBody,crearUsuarioAdmin,cambiarEstadoUsuarioAdmin,rolesUsuarios} from '../src/services/usuariosAdminService.js';
const usuario={id:'u',nombre:'Usuario real',correo:'real@example.invalid',rol:'Mesero',estado:'activo'};
const roles=rolesUsuarios.map((nombre,i)=>({nombre,id:i+11}));
const form={nombre:'Nuevo',correo:'nuevo@example.invalid',roles_id:'13',contrasena:'Clave123!',confirmacion:'Clave123!'};
const resource=data=>({data,loading:false,error:'',refresh:async()=>{}});
test('usuarios admin: contrato real, catálogo, creación sin confirmación y cambio de estado',async()=>{
 const old=globalThis.fetch;const calls=[];
 try{
  globalThis.fetch=async(u,o)=>{calls.push([u,o]);return new Response(JSON.stringify(u.endsWith('/roles')?{datos:roles}:u.endsWith('/registrar')?{usuario}:u.endsWith('/estado')?{ok:true,data:{usuario_id:'u',nuevo_estado:JSON.parse(o.body).estado}}:{datos:[{...usuario,password_hash:'NO EXPONER'}]}));};
  assert.deepEqual(await listarUsuariosAdmin(),[usuario]);assert.deepEqual(await listarRolesUsuarios(),roles);
  const body=usuarioAdminBody(form,roles);assert.equal(body.roles_id,13);assert.equal(Object.hasOwn(body,'confirmacion'),false);await crearUsuarioAdmin(body);await cambiarEstadoUsuarioAdmin('u','inactivo');
  assert.equal(calls[2][1].method,'POST');assert.deepEqual(JSON.parse(calls[2][1].body),body);assert.equal(calls[3][1].method,'PUT');assert.deepEqual(JSON.parse(calls[3][1].body),{estado:'inactivo'});
 }finally{globalThis.fetch=old;}
});
test('validaciones: nombre, correo, roles reales, contraseña y confirmación',()=>{
 for(const patch of [{nombre:''},{nombre:'x'.repeat(101)},{correo:'incorrecto'},{roles_id:'999'},{contrasena:''},{contrasena:'x'.repeat(73)},{confirmacion:'otra'}])assert.throws(()=>usuarioAdminBody({...form,...patch},roles));
 for(const r of roles)assert.equal(usuarioAdminBody({...form,roles_id:r.id},roles).roles_id,r.id);
 assert.throws(()=>usuarioAdminBody({...form,roles_id:99},[{id:99,nombre:'Caja'}]));
});
test('errores backend conservan mensaje de correo duplicado y estado inexistente',async()=>{
 const old=globalThis.fetch;try{
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'Ya existe un usuario con ese correo.'}),{status:409});await assert.rejects(()=>crearUsuarioAdmin({}),/Ya existe/);
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,msg:'No se encontró el usuario.'}),{status:404});await assert.rejects(()=>cambiarEstadoUsuarioAdmin('u','inactivo'),/No se encontró/);
 }finally{globalThis.fetch=old;}
});
test('Administración real renderizada: listado, formulario, estado y permisos',async t=>{
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'usuarios-admin-test',enforce:'pre',transform(s,f){
  f=f.replaceAll('\\','/');
  if(f.endsWith('/hooks/useRemoteCatalog.js'))return s.replace('export function useRemoteCatalog(loader) {','export function useRemoteCatalog(loader) {return globalThis.__usuariosResources.shift();');
  if(f.endsWith('/pages/AdministracionPage.jsx'))return s.replace('if(!permitido)return','globalThis.__usuariosCambiar=cambiar;globalThis.__usuariosCreado=creado;globalThis.__usuariosRetry=usuarios.refresh;if(!permitido)return');
  if(f.endsWith('/components/UsuarioAdminForm.jsx'))return s.replace("useState({nombre:'',correo:'',roles_id:'',contrasena:'',confirmacion:''})","useState(globalThis.__usuariosForm)").replace('return <section','globalThis.__usuariosSubmit=submit;return <section');
 }}]});
 const old=globalThis.fetch;
 try{
  const {default:Page}=await server.ssrLoadModule('/src/pages/AdministracionPage.jsx'),{default:Form}=await server.ssrLoadModule('/src/components/UsuarioAdminForm.jsx'),{default:Roles}=await server.ssrLoadModule('/src/components/RolesPermisosSection.jsx'),{AuthContext}=await server.ssrLoadModule('/src/context/useAuth.js');
  const render=(Component,props={},rol='Administrador')=>renderToString(React.createElement(AuthContext.Provider,{value:{user:{rol}}},React.createElement(Component,props)));
  const page=(r=resource([usuario]),rol='Administrador')=>{globalThis.__usuariosResources=[r,resource(roles)];return render(Page,{},rol);};
  await t.test('listado y roles reales; únicamente administradores operan',()=>{
   for(const rol of ['Administrador','SuperAdmin']){const html=page(resource([usuario]),rol);assert.match(html,/Usuario real/);assert.match(html,/real@example.invalid/);assert.match(html,/Crear usuario/);assert.match(html,/Desactivar/);}
   assert.match(page(resource([{...usuario,estado:'inactivo'}])),/>Activar</);
   for(const rol of ['Mesero','Mesera','Bartender','Cajero'])assert.doesNotMatch(page(resource([usuario]),rol),/Crear usuario|Desactivar|real@example.invalid/);
  });
  await t.test('vacío, carga, error y reintento real',async()=>{
   assert.match(page(resource([])),/Aún no hay usuarios/);assert.match(page({...resource([]),loading:true}),/Cargando/);
   let reads=0;const html=page({...resource([]),error:'No fue posible consultar los usuarios.',refresh:async()=>reads++});assert.match(html,/Reintentar/);assert.match(html,/No fue posible consultar/);await globalThis.__usuariosRetry();assert.equal(reads,1);
  });
  await t.test('activar/desactivar envía PUT y reconsulta sin mutación optimista',async()=>{
   let reads=0;page({...resource([usuario]),refresh:async()=>reads++});const states=[];
   globalThis.fetch=async(u,o)=>{assert.match(u,/\/usuarios\/u\/estado$/);assert.equal(o.method,'PUT');const estado=JSON.parse(o.body).estado;states.push(estado);return new Response(JSON.stringify({ok:true,data:{usuario_id:'u',nuevo_estado:estado}}));};
   await globalThis.__usuariosCambiar(usuario);await globalThis.__usuariosCambiar({...usuario,estado:'inactivo'});assert.deepEqual(states,['inactivo','activo']);assert.equal(reads,2);assert.equal(usuario.estado,'activo');
  });
  await t.test('formulario validado, contraseña oculta, crea y reconsulta',async()=>{
   globalThis.__usuariosForm=form;let reads=0,closed=0;page({...resource([usuario]),refresh:async()=>reads++});const changed=globalThis.__usuariosCreado;
   const html=render(Form,{roles:resource(roles),onChanged:changed,onCancel:()=>closed++});assert.match(html,/Confirmar contraseña/);assert.match(html,/type="password"/);for(const r of roles)assert.ok(html.includes(r.nombre));assert.doesNotMatch(html,/value="Caja"|value="Juegos"/);
   let body;globalThis.fetch=async(u,o)=>{assert.match(u,/\/usuarios\/registrar$/);body=JSON.parse(o.body);return new Response(JSON.stringify({usuario}),{status:201});};await globalThis.__usuariosSubmit({preventDefault(){}});assert.deepEqual(body,usuarioAdminBody(form,roles));assert.equal(reads,1);assert.equal(closed,1);
   globalThis.__usuariosForm={...form,confirmacion:'distinta'};assert.match(render(Form,{roles:resource(roles)}),/Las contraseñas no coinciden/);
  });
  await t.test('roles informativos sin edición ficticia',()=>{const html=render(Roles,{roles:resource(roles)});assert.match(html,/definidos por el sistema/);for(const r of roles)assert.ok(html.includes(r.nombre));assert.match(html,/usuarios.registrar/);assert.doesNotMatch(html,/<input|<select|<button/);});
  await t.test('roles: carga, vacío y error con reintento',()=>{
   assert.match(render(Roles,{roles:{...resource([]),loading:true}}),/Cargando información/);
   assert.match(render(Roles,{roles:resource([])}),/No hay roles disponibles/);
   const html=render(Roles,{roles:{...resource([]),error:'No fue posible consultar roles.'}});assert.match(html,/No fue posible consultar roles/);assert.match(html,/Reintentar/);
  });
 }finally{globalThis.fetch=old;for(const k of ['__usuariosResources','__usuariosForm','__usuariosSubmit','__usuariosCambiar','__usuariosCreado','__usuariosRetry'])delete globalThis[k];await server.close();}
});
test('sin usuarios ficticios, cambios locales de roles ni contraseñas persistidas en navegador',()=>{
 const page=readFileSync(new URL('../src/pages/AdministracionPage.jsx',import.meta.url),'utf8');assert.doesNotMatch(page,/karol@|laura@|carlos@|setUsuarios|cambiarRolUsuario|ultimoAcceso/);
 const formSource=readFileSync(new URL('../src/components/UsuarioAdminForm.jsx',import.meta.url),'utf8');assert.doesNotMatch(formSource,/localStorage|sessionStorage|console\.log/);
});
