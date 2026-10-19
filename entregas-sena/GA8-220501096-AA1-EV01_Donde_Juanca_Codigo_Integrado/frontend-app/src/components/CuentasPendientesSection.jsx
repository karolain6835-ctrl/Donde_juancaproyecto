import PagoDirectoPedido from './PagoDirectoPedido';
import ComprobantePedido from './ComprobantePedido';
import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {listarPedidos} from '../services/pedidosService';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import OperacionRemoteState from './OperacionRemoteState';
import {InventoryPagination} from './InventoryRemoteState';
import DivisionCuenta from './DivisionCuenta';
import './CuentasPendientesSection.css';
import './OperacionForms.css';
import './CatalogoForm.css';
export default function CuentasPendientesSection(){
 const {user}=useAuth();
 const [estado,setEstado]=useState('abierto');
 const [pagina,setPagina]=useState(1),[selected,setSelected]=useState(null),[busqueda,setBusqueda]=useState('');
 const orders=useRemoteCatalog(useCallback(options=>can(user,'divisiones.ver')?listarPedidos({estado,pagina,limite:20},options):Promise.resolve({datos:[]}),[estado,pagina,user]));
 if(!can(user,'divisiones.ver'))return <p>No tienes permiso para consultar estas cuentas.</p>;
 const rows=(orders.data?.datos||[]).filter(p=>[p.id,p.cliente_nombre,p.mesa_numero].some(v=>String(v??'').toLowerCase().includes(busqueda.toLowerCase())));
 return <section className="cuentas-pendientes-section">
  <div className="cuentas-pendientes-toolbar"><div><h2>Cuentas pendientes</h2><p>Selecciona un pedido para pagar o dividir su cuenta.</p></div></div>
  <div className="cuentas-filtros"><label>Pedidos<select value={estado} onChange={e=>{setEstado(e.target.value);setPagina(1);}}><option value="abierto">Abiertos</option><option value="cerrado">Cerrados</option></select></label><label>Buscar en esta página<input type="search" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></label></div>
  <OperacionRemoteState resource={orders} empty="No hay pedidos para mostrar.">
   <div className="cuentas-grid">{rows.map(p=><article className="cuenta-card" key={p.id}><header className="cuenta-cabecera"><h3>Mesa {p.mesa_numero??p.mesas_id}</h3><p className="cuenta-referencia" title={p.id}>Pedido #{p.id.slice(0,8)}</p></header><dl className="cuenta-personas"><div><dt>Cliente</dt><dd>{p.cliente_nombre||'Sin cliente asociado'}</dd></div><div><dt>Responsable</dt><dd>{p.responsable_nombre||'—'}</dd></div></dl>
    {p.estado==='abierto'?<PagoDirectoPedido pedidoId={p.id} version={p} onDivision={()=>setSelected(p.id)} onChanged={orders.refresh}/>:<button className="drawer-secondary-button" onClick={()=>setSelected(p.id)}>Ver divisiones</button>}{p.estado==='cerrado'&&<ComprobantePedido pedidoId={p.id} estado={p.estado} mesaNumero={p.mesa_numero}/>}</article>)}</div>
   {!orders.loading&&!orders.error&&orders.data?.datos.length>0&&!rows.length&&<p>No hay coincidencias en esta página.</p>}
  </OperacionRemoteState>
  <InventoryPagination resource={{...orders,query:{pagina},setQuery:q=>setPagina(q.pagina)}}/>
  {selected&&<DivisionCuenta key={selected} pedidoId={selected} onClose={()=>{setSelected(null);orders.refresh();}} onChanged={orders.refresh}/>}
 </section>;
}
