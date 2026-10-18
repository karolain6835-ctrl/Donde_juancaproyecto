import {useQuickAction} from '../hooks/useQuickAction';
import { useHeaderSection } from '../hooks/useHeaderSection';
import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog,useCatalogMutation} from '../hooks/useRemoteCatalog';
import {listarUsuariosAdmin,listarRolesUsuarios,cambiarEstadoUsuarioAdmin,estadosUsuarios} from '../services/usuariosAdminService';
import UsuarioAdminForm from '../components/UsuarioAdminForm';
import OperacionRemoteState from '../components/OperacionRemoteState';
import RolesPermisosSection from '../components/RolesPermisosSection';
import AuditoriaSection from '../components/AuditoriaSection';
import ConfiguracionSection from '../components/ConfiguracionSection';
import './AdministracionPage.css';
import '../components/OperacionForms.css';
import '../components/CatalogoForm.css';
export default function AdministracionPage(){
 const {user}=useAuth();const permitido=can(user,'usuarios.ver');
 const [seccion,setSeccion]=useHeaderSection('usuarios', ['usuarios','roles','auditoria','configuracion']),[busqueda,setBusqueda]=useState(''),[estado,setEstado]=useState(''),[crear,setCrear]=useQuickAction("usuario",can(user,"usuarios.registrar")),[notice,setNotice]=useState('');
 const usuarios=useRemoteCatalog(useCallback(options=>permitido?listarUsuariosAdmin(options):Promise.resolve([]),[permitido]));
 const roles=useRemoteCatalog(useCallback(options=>permitido?listarRolesUsuarios(options):Promise.resolve([]),[permitido]));
 const mutation=useCatalogMutation();
 async function cambiar(u){if(!can(user,'usuarios.cambiarEstado')||usuarios.loading||usuarios.error)return;await mutation.run(()=>cambiarEstadoUsuarioAdmin(u.id,u.estado==='activo'?'inactivo':'activo'),usuarios.refresh,'Estado del usuario actualizado.');}
 async function creado(){setNotice('Usuario creado correctamente.');await usuarios.refresh();}
 if(!permitido)return <p>No tienes permiso para consultar usuarios.</p>;
 const rows=(usuarios.data||[]).filter(u=>(!estado||u.estado===estado)&&[u.nombre,u.correo,u.rol].some(v=>v?.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es'))));
 return <div className="administracion-page"><header className="administracion-header"><div><p className="page-eyebrow">ADMINISTRACIÓN</p><h1 className="page-title">{seccion==='usuarios'?'Usuarios':seccion==='roles'?'Roles y permisos':seccion==='auditoria'?'Auditoría':'Configuración'}</h1></div>{seccion==='usuarios'&&can(user,'usuarios.registrar')&&<button className="primary-button administracion-create-button" onClick={()=>setCrear(true)}>Crear usuario</button>}</header>
 <nav className="administracion-nav">{[['usuarios','Usuarios'],['roles','Roles y permisos'],['auditoria','Auditoría'],['configuracion','Configuración']].map(([id,label])=><button key={id} className={seccion===id?'active':''} onClick={()=>setSeccion(id)}>{label}</button>)}</nav>
 {seccion==='usuarios'&&<><div className="usuarios-admin-toolbar"><label>Buscar usuario<input type="search" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></label><label>Estado<select value={estado} onChange={e=>setEstado(e.target.value)}><option value="">Todos</option>{Object.entries(estadosUsuarios).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label><button className="drawer-secondary-button" disabled={usuarios.loading} onClick={usuarios.refresh}>Actualizar</button></div>
 {notice&&<p className="pedido-feedback" role="status">{notice}</p>}{mutation.success&&<p className="pedido-feedback" role="status">{mutation.success}</p>}{mutation.error&&<p role="alert">{mutation.error}</p>}
 <OperacionRemoteState resource={{...usuarios,data:rows}} empty={usuarios.data?.length?'No hay usuarios que coincidan con la búsqueda.':'Aún no hay usuarios.'}><div className="administracion-table-wrapper"><table className="administracion-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(u=><tr key={u.id}><td>{u.nombre||'Sin nombre'}</td><td>{u.correo}</td><td><span className="administracion-role-chip">{u.rol}</span></td><td><span className={'administracion-status '+u.estado}>{estadosUsuarios[u.estado]||'Sin estado'}</span></td><td>{can(user,'usuarios.cambiarEstado')&&<button className="drawer-secondary-button" disabled={mutation.busy||usuarios.loading||Boolean(usuarios.error)} onClick={()=>cambiar(u)}>{u.estado==='activo'?'Desactivar':'Activar'}</button>}</td></tr>)}</tbody></table></div></OperacionRemoteState>
 {crear&&<UsuarioAdminForm roles={roles} onChanged={creado} onCancel={()=>setCrear(false)}/>}</>}
 {seccion==='roles'&&<RolesPermisosSection/>}{seccion==='auditoria'&&<AuditoriaSection/>}{seccion==='configuracion'&&<ConfiguracionSection/>}</div>;
}
