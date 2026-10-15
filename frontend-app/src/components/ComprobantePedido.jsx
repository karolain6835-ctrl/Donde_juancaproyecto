import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog,useCatalogMutation} from '../hooks/useRemoteCatalog';
import {comprobantePedido,generarComprobante} from '../services/comprobantesService';
import {formatCurrency} from '../utils/formatCurrency';
import {formatDateTime} from '../utils/dateTime';
import OperacionRemoteState from './OperacionRemoteState';
import './ComprobantePedido.css';
export function VistaComprobante({comprobante:c,mesaNumero}){
 return <article className="comprobante-documento"><header><h2>DONDE JUANCA</h2><p>Comprobante N.º {c.numero}</p></header>
  <dl><div><dt>Fecha</dt><dd>{formatDateTime(c.emitido_en)}</dd></div>{mesaNumero!=null&&<div><dt>Mesa</dt><dd>{mesaNumero}</dd></div>}<div><dt>Cliente</dt><dd>{c.cliente_nombre}</dd></div></dl>
  <div className="comprobante-tabla"><table><thead><tr><th>Consumo</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>{c.items.map(i=><tr key={i.id}><td>{i.descripcion}{i.tipo==='juego'&&<small>Juego</small>}</td><td>{i.cantidad}</td><td>{formatCurrency(i.precio_unitario)}</td><td>{formatCurrency(i.subtotal)}</td></tr>)}</tbody></table></div>
  <dl className="comprobante-totales"><div><dt>Productos</dt><dd>{formatCurrency(c.total_productos)}</dd></div><div><dt>Juegos</dt><dd>{formatCurrency(c.total_juegos)}</dd></div><div><dt>Total</dt><dd><strong>{formatCurrency(c.total_general)}</strong></dd></div><div><dt>Pagado</dt><dd>{formatCurrency(c.total_pagado)}</dd></div></dl>
  <small className="comprobante-referencia">Pedido: {c.pedidos_id}</small>
 </article>;
}
function imprimirComprobante(element){
 if(!element)return;
 document.querySelectorAll('.comprobante-impresion').forEach(node=>node.remove());
 const copia=element.cloneNode(true);
 copia.classList.add('comprobante-impresion');
 document.body.appendChild(copia);
 const limpiar=()=>copia.remove();
 window.addEventListener('afterprint',limpiar,{once:true});
 window.print();
}
export default function ComprobantePedido({pedidoId,estado,mesaNumero}){
 const {user}=useAuth();
 const permitido=can(user,'comprobantes.ver')&&estado==='cerrado';
 const resource=useRemoteCatalog(useCallback(options=>permitido?comprobantePedido(pedidoId,options):Promise.resolve(null),[permitido,pedidoId]));
 const mutation=useCatalogMutation(),[visible,setVisible]=useState(false);
 if(!permitido)return null;
 const data=resource.data;
 async function generar(){await mutation.run(()=>generarComprobante(pedidoId),async()=>{await resource.refresh();setVisible(true);},'Comprobante disponible.');}
 return <section className="comprobante-seccion"><OperacionRemoteState resource={resource}>
  {data?.comprobante?<button className="drawer-secondary-button" onClick={()=>setVisible(true)}>Ver comprobante</button>:data?.puede_generar&&can(user,'ventas.facturar')?<button className="drawer-secondary-button" disabled={mutation.busy} onClick={generar}>{mutation.busy?'Generando...':'Generar comprobante'}</button>:data?.motivo&&<p>{data.motivo}</p>}
  {visible&&data?.comprobante&&<div className="comprobante-vista"><div className="comprobante-controles"><button className="drawer-secondary-button" onClick={e=>imprimirComprobante(e.currentTarget.closest('.comprobante-vista').querySelector('.comprobante-documento'))}>Imprimir</button><button className="drawer-secondary-button" onClick={()=>setVisible(false)}>Cerrar comprobante</button></div><VistaComprobante comprobante={data.comprobante} mesaNumero={data.mesa_numero??mesaNumero}/></div>}
 </OperacionRemoteState>{mutation.error&&<p role="alert">{mutation.error}</p>}{mutation.success&&<p role="status">{mutation.success}</p>}</section>;
}
