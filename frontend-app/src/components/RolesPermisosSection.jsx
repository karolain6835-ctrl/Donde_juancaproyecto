import OperacionRemoteState from './OperacionRemoteState';
import {permissions} from '../utils/permissions';
import './RolesPermisosSection.css';

export default function RolesPermisosSection({roles}){
 return <section className="roles-permisos-section"><h2>Roles y permisos</h2>
  <p>Los permisos están definidos por el sistema y no se pueden editar desde esta pantalla.</p>
  <p>Consulta los permisos operativos de la aplicación para cada rol.</p>
  <OperacionRemoteState resource={roles} empty="No hay roles disponibles.">
   <div className="roles-permisos-grid">{(roles.data||[]).map(rol=>{
    const accesos=Object.entries(permissions).filter(([,allowed])=>allowed.includes(rol.nombre)).map(([action])=>action);
    return <details className="roles-permisos-card" key={rol.id}>
     <summary>{rol.nombre} <span>({accesos.length} permisos)</span></summary>
     {accesos.length?<ul>{accesos.map(action=><li key={action}><code>{action}</code></li>)}</ul>:<p>No hay permisos operativos definidos para este rol.</p>}
    </details>;
   })}</div>
  </OperacionRemoteState>
 </section>;
}
