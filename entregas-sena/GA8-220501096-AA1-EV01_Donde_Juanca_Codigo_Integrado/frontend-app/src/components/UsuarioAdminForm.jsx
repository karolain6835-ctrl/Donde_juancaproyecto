import {useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useCatalogMutation} from '../hooks/useRemoteCatalog';
import {usuarioAdminBody,crearUsuarioAdmin} from '../services/usuariosAdminService';
import OperacionRemoteState from './OperacionRemoteState';
export default function UsuarioAdminForm({roles,onChanged,onCancel}){
 const {user}=useAuth();
 const [form,setForm]=useState({nombre:'',correo:'',roles_id:'',contrasena:'',confirmacion:''});
 const mutation=useCatalogMutation();
 let validation='';try{usuarioAdminBody(form,roles.data||[]);}catch(e){validation=e.message;}
 async function submit(e){
  e.preventDefault();if(!can(user,'usuarios.registrar')||validation||roles.loading||roles.error)return;
  await mutation.run(async()=>{await crearUsuarioAdmin(usuarioAdminBody(form,roles.data));setForm({nombre:'',correo:'',roles_id:'',contrasena:'',confirmacion:''});},async()=>{await onChanged();onCancel();},'Usuario creado correctamente.');
 }
 if(!can(user,'usuarios.registrar'))return null;
 return <section className="usuarios-admin-form"><h2>Crear usuario</h2><OperacionRemoteState resource={roles} empty="No hay roles disponibles."/><form className="catalogo-form" onSubmit={submit}><fieldset disabled={mutation.busy||roles.loading||Boolean(roles.error)||!roles.data?.length}>
  <label>Nombre<input autoComplete="name" maxLength={100} value={form.nombre} required onChange={e=>setForm({...form,nombre:e.target.value})}/></label>
  <label>Correo<input type="email" autoComplete="off" maxLength={150} value={form.correo} required onChange={e=>setForm({...form,correo:e.target.value})}/></label>
  <label>Rol<select value={form.roles_id} required onChange={e=>setForm({...form,roles_id:e.target.value})}><option value="">Selecciona un rol</option>{(roles.data||[]).map(r=><option value={r.id} key={r.id}>{r.nombre}</option>)}</select></label>
  <label>Contraseña<input type="password" autoComplete="new-password" value={form.contrasena} required onChange={e=>setForm({...form,contrasena:e.target.value})}/></label>
  <label>Confirmar contraseña<input type="password" autoComplete="new-password" value={form.confirmacion} required onChange={e=>setForm({...form,confirmacion:e.target.value})}/></label>
  {validation&&<p>{validation}</p>}<div className="operacion-actions"><button className="drawer-primary-button" disabled={Boolean(validation)} type="submit">{mutation.busy?'Creando...':'Crear usuario'}</button><button className="drawer-secondary-button" type="button" onClick={onCancel}>Cancelar</button></div>
 </fieldset></form>{mutation.error&&<p role="alert">{mutation.error}</p>}</section>;
}
