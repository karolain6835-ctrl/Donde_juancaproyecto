import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {listarCompras,detalleCompra,estadosCompra} from '../services/comprasService';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import {formatCurrency} from '../utils/formatCurrency';
import {formatDateTime} from '../utils/dateTime';
import InventoryRemoteState,{InventoryPagination} from './InventoryRemoteState';
import './HistorialComprasProveedor.css';

export default function HistorialComprasProveedor({proveedor,onClose}){
 const {user}=useAuth();const permitted=can(user,'compras.ver')&&can(user,'proveedores.ver');
 const [query,setQuery]=useState({pagina:1}),[selected,setSelected]=useState(null);
 const history=useRemoteCatalog(useCallback(options=>permitted?listarCompras({...query,proveedores_id:proveedor.id},options):Promise.resolve({datos:[]}),[permitted,query,proveedor.id]));
 // Solo consulta un detalle elegido; no hay una petición por cada compra del listado.
 const detail=useRemoteCatalog(useCallback(async options=>{
  if(!permitted||!selected)return {datos:[]};
  const compra=await detalleCompra(selected,options);
  if(compra.proveedores_id!==proveedor.id)throw new Error('La compra no pertenece a este proveedor.');
  return {datos:[compra]};
 },[permitted,selected,proveedor.id]));
 if(!permitted)return <p>No tienes permiso para consultar compras.</p>;
 const compra=detail.data?.datos?.[0];
 return <section className="proveedor-history" aria-label="Historial de compras"><header><div><h2>Compras de {proveedor.nombre}</h2><p>Totales estimados y recibidos según cada compra.</p></div><button className="drawer-secondary-button" onClick={onClose}>Volver al proveedor</button></header>
  <InventoryRemoteState resource={history} empty="Este proveedor aún no tiene compras registradas."><div className="proveedor-history-table"><table><thead><tr><th>Fecha</th><th>Compra</th><th>Estado</th><th>Total estimado</th><th>Total recibido</th><th></th></tr></thead><tbody>{(history.data?.datos||[]).map(row=><tr key={row.id}><td>{formatDateTime(row.creado_en)}</td><td><span title={row.id}>{row.id.slice(0,8)}</span></td><td>{estadosCompra[row.estado]}</td><td>{formatCurrency(row.total_estimado)}</td><td>{formatCurrency(row.total_recibido)}</td><td><button className="drawer-secondary-button" onClick={()=>setSelected(row.id)}>Ver productos</button></td></tr>)}</tbody></table></div></InventoryRemoteState>
  <InventoryPagination resource={{...history,query,setQuery:next=>{setSelected(null);setQuery(next);}}}/>
  {selected&&<section className="proveedor-history-detail"><header><h3>Productos de la compra</h3><button className="drawer-secondary-button" onClick={()=>setSelected(null)}>Cerrar productos</button></header><InventoryRemoteState resource={detail} empty="No hay productos para mostrar.">{compra&&<><p>{compra.items.length} productos · {estadosCompra[compra.estado]}</p><div className="proveedor-history-table"><table><thead><tr><th>Producto</th><th>Cantidad pedida</th><th>Costo unitario</th><th>Total del producto</th></tr></thead><tbody>{compra.items.map(item=><tr key={item.id}><td>{item.producto_nombre||'Producto sin nombre disponible'}</td><td>{item.cantidad}</td><td>{formatCurrency(item.precio_unitario)}</td><td>{formatCurrency(item.subtotal)}</td></tr>)}</tbody></table></div></>}</InventoryRemoteState></section>}
 </section>;
}
