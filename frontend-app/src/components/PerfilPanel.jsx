import {useCallback,useEffect,useRef,useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {useAuth} from '../context/useAuth';
import {actualizarPerfil,cambiarPassword,passwordBody,perfilBody} from '../services/perfilService';
const EMPTY_PASSWORD={contrasena_actual:'',contrasena_nueva:'',confirmar_contrasena:''};
export default function PerfilPanel({modo,onClose}){
 const {refreshProfile}=useAuth();
 const [perfil,setPerfil]=useState(null),[form,setForm]=useState({nombre:'',correo:''});
 const [visible,setVisible]=useState({});
 const [password,setPassword]=useState({...EMPTY_PASSWORD});
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[retry,setRetry]=useState(0);
 const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const cargar=useCallback(options=>refreshProfile(options),[refreshProfile]);
 useEffect(()=>{
  const controller=new AbortController();
  cargar({signal:controller.signal}).then(u=>{if(!controller.signal.aborted){setPerfil(u);setForm({nombre:u.nombre,correo:u.correo});setError('');setLoading(false);}}).catch(e=>{if(!controller.signal.aborted){setError(e.message);setLoading(false);}});
  return()=>controller.abort();
 },[cargar,retry]);
 async function guardar(event){
  event.preventDefault();if(lock.current)return;
  lock.current=true;setSaving(true);setError('');setSuccess('');
  try{
   if(modo==='perfil'){perfilBody(form);await actualizarPerfil(form);const u=await refreshProfile();if(alive.current){setPerfil(u);setForm({nombre:u.nombre,correo:u.correo});setSuccess('Perfil actualizado correctamente.');}}
   else{passwordBody(password);await cambiarPassword(password);if(alive.current){setPassword({...EMPTY_PASSWORD});setVisible({});setSuccess('Contraseña cambiada correctamente.');}}
  }catch(e){if(alive.current)setError(e.message);}
  finally{lock.current=false;if(alive.current)setSaving(false);}
 }
 const close=()=>{if(!lock.current)onClose();};
 return <><div className="profile-overlay" onClick={close}/><aside className="profile-drawer" role="dialog" aria-modal="true" aria-label={modo==='perfil'?'Mi perfil':'Cambiar contraseña'}><div className="profile-drawer-header"><div><p className="page-eyebrow">{modo==='perfil'?'MI PERFIL':'SEGURIDAD'}</p><h2>{modo==='perfil'?'Perfil de usuario':'Cambiar contraseña'}</h2></div><button className="drawer-close" disabled={saving} aria-label="Cerrar panel" onClick={close}>×</button></div>
 {loading?<p role="status">Cargando perfil...</p>:!perfil?<div role="alert">{error}<button className="drawer-secondary-button" onClick={()=>{setLoading(true);setRetry(v=>v+1);}}>Reintentar</button></div>:<>
 {error&&<p role="alert">{error}</p>}{success&&<p role="status" className="profile-notice">{success}</p>}
 {modo==='perfil'&&<div className="profile-content"><div className="profile-main-card"><div className="profile-large-avatar">{perfil.nombre.charAt(0).toUpperCase()}</div><div><h3>{perfil.nombre}</h3><span>{perfil.rol}</span></div></div><div className="profile-detail-grid"><div><span>Rol</span><strong>{perfil.rol}</strong></div><div><span>Estado</span><strong>{perfil.estado==='activo'?'Activo':'Inactivo'}</strong></div></div></div>}
 <form className="security-form" onSubmit={guardar}><fieldset disabled={saving}>
 {modo==='perfil'?<><label>Nombre<input required maxLength={100} autoComplete="name" value={form.nombre} onChange={e=>{setForm({...form,nombre:e.target.value});setSuccess('');}}/></label><label>Correo<input type="email" required maxLength={150} autoComplete="email" value={form.correo} onChange={e=>{setForm({...form,correo:e.target.value});setSuccess('');}}/></label></>:Object.entries({contrasena_actual:'Contraseña actual',contrasena_nueva:'Nueva contraseña',confirmar_contrasena:'Confirmar nueva contraseña'}).map(([key,label])=><label key={key}>{label}<div className="profile-password-input"><input required type={visible[key]?"text":"password"} autoComplete={key==='contrasena_actual'?'current-password':'new-password'} value={password[key]} onChange={e=>{setPassword({...password,[key]:e.target.value});setSuccess('');}}/><button type="button" aria-label={(visible[key]?'Ocultar ':'Mostrar ')+label.toLowerCase()} onClick={()=>setVisible({...visible,[key]:!visible[key]})}>{visible[key]?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>)}
 <div className="profile-form-actions"><button type="button" className="drawer-secondary-button" onClick={close}>Cancelar</button><button className="drawer-primary-button">{saving?'Guardando...':modo==='perfil'?'Guardar cambios':'Cambiar contraseña'}</button></div></fieldset></form>
 </>}
 </aside></>;
}
