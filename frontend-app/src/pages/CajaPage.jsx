import {useHeaderSection} from '../hooks/useHeaderSection';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import PagosGlobal from '../components/PagosGlobal';
import CuentasPendientesSection from '../components/CuentasPendientesSection';
import CierresCajaSection from '../components/CierresCajaSection';
import './CajaPage.css';
export default function CajaPage(){
 const {user}=useAuth();
 const [seccionActiva,setSeccionActiva]=useHeaderSection(can(user,'pagos.ver')?'pagos':'pendientes', ['pagos','pendientes','cierres'].filter(s=>can(user,s==='cierres'?'cierres.ver':s==='pagos'?'pagos.ver':'pagos.crear')));
 return <div className="caja-page"><header className="caja-header"><p className="page-eyebrow">CAJA Y PAGOS</p><h1 className="page-title">{seccionActiva==='pagos'?'Pagos':seccionActiva==='pendientes'?'Cuentas pendientes':'Cierres de caja'}</h1><p className="page-description">Consulta los pagos y las cuentas.</p></header>
 <nav className="caja-nav">{[['pagos','pagos.ver','Pagos'],['pendientes','pagos.crear','Cuentas pendientes'],['cierres','cierres.ver','Cierres de caja']].filter(([,permission])=>can(user,permission)).map(([id,,label])=><button key={id} className={seccionActiva===id?'active':''} onClick={()=>setSeccionActiva(id)}>{label}</button>)}</nav>
 {seccionActiva==='pagos'&&can(user,'pagos.ver')&&<PagosGlobal/>}
 {seccionActiva==='pendientes'&&can(user,'pagos.crear')&&<CuentasPendientesSection/>}
 {seccionActiva==='cierres'&&can(user,'cierres.ver')&&<CierresCajaSection/>}
 </div>;
}
