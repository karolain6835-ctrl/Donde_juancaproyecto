import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {historialCliente} from '../services/clientesService';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import {formatCurrency} from '../utils/formatCurrency';
import {formatDateTime} from '../utils/dateTime';
import InventoryRemoteState,{InventoryPagination} from './InventoryRemoteState';
import './HistorialClientesSection.css';

export default function HistorialClientesSection({cliente}) {
 const {user}=useAuth();const permitido=can(user,'clientes.ver');
 const [query,setQuery]=useState({pagina:1});
 const resource=useRemoteCatalog(useCallback(options=>cliente&&permitido?historialCliente(cliente.id,query,options):Promise.resolve({datos:[]}),[cliente,permitido,query]));
 if(!permitido)return <p>No tienes permiso para consultar clientes.</p>;
 if(!cliente)return <section className="historial-clientes-panel"><h2>Historial de clientes</h2><p>Selecciona un cliente desde su detalle para consultar el historial.</p></section>;
 return <section className="historial-clientes-panel"><div className="historial-clientes-panel-header"><div><h2>Historial de {cliente.nombre}</h2><p>El total del pedido puede incluir consumos de otras personas. Los consumos y pagos del cliente se muestran por separado.</p></div></div>
  <InventoryRemoteState resource={resource} empty="Este cliente aún no tiene historial."><div className="historial-clientes-table-wrapper"><table className="historial-clientes-table"><thead><tr><th>Fecha</th><th>Mesa</th><th>Estado</th><th>Relación</th><th>Total del pedido</th><th>Productos del cliente</th><th>Pagos verificados del cliente</th></tr></thead><tbody>{(resource.data?.datos||[]).map(row=><tr key={row.id}><td>{formatDateTime(row.fecha)}</td><td>{row.mesa??'—'}</td><td>{{abierto:'Abierto',cerrado:'Cerrado',cancelado:'Cancelado'}[row.estado]||row.estado}</td><td>{row.cliente_del_pedido?'Cliente del pedido':row.sesion_mesa_id?'Cliente en la visita':'Cliente en el pedido'}</td><td>{formatCurrency(row.total_pedido)}{!row.total_definitivo&&<small> · Total provisional de juegos</small>}</td><td>{formatCurrency(row.consumo_cliente)}</td><td>{formatCurrency(row.pagos_atribuidos)}</td></tr>)}</tbody></table></div></InventoryRemoteState>
  <InventoryPagination resource={{...resource,query,setQuery}}/>
  <p>Se muestran solo productos con cliente identificado y pagos con pagador identificado. Los juegos se incluyen únicamente en el total del pedido.</p>
 </section>;
}
