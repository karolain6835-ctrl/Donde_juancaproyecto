import ComprobantePedido from './ComprobantePedido';
import ProductoImagen from './ProductoImagen';
import { useCallback, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/dateTime';
import {centavosDivision,decimalDivision} from '../services/divisionesService';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';
import { detallePedido, agregarItemPedido, cancelarItemPedido } from '../services/pedidosService';
import { listarKanban } from '../services/kanbanService';
import { listarMovimientos } from '../services/inventarioService';
import { sincronizarOperacion } from '../services/operacionContract';
import OperacionRemoteState from './OperacionRemoteState';
import PedidoParticipantes from './PedidoParticipantes';
import RondasConsumo from './RondasConsumo';
import { listarParticipantes } from '../services/participantesService';
import './CatalogoForm.css';
import './OperacionForms.css';
import './PedidoDetalle.css';

// Solo presentación: precio histórico por cantidad, sin alterar cargos ni pagos.
function subtotalProducto(item) {
  try { return decimalDivision(centavosDivision(item.precio_unitario) * BigInt(item.cantidad_pedida)); }
  catch { return null; }
}

export default function PedidoDetalle({ id, summary, mesas, productos, onClose, onChanged }) {
  const { user } = useAuth();
  const loader = useCallback(options => detallePedido(id, options), [id]);
  const detail = useRemoteCatalog(loader);
  const participants = useRemoteCatalog(useCallback(options => listarParticipantes(id, options), [id]));
  const mutation = useCatalogMutation();
  const [form, setForm] = useState({ productos_id: '', cantidad_pedida: '' });
  const [cancelId, setCancelId] = useState(null);
  const [syncError, setSyncError] = useState('');
  const product = productos.data?.find(p => p.id === form.productos_id);
  const pedido = detail.data;
  const clienteSeleccionado = !participants.loading && !participants.error && (participants.data || []).some(p => p.id === form.participante_id);
  const subtotales = pedido?.items.filter(item => item.estado !== 'cancelado').map(subtotalProducto);
  const totalProductos = subtotales && subtotales.every(value => value !== null) ? decimalDivision(subtotales.reduce((sum,value)=>sum+centavosDivision(value),0n)) : null;
  async function refresh() {
    setSyncError('');
    await Promise.all([detail.refresh(), participants.refresh(), productos.refresh(), mesas.refresh(), onChanged(),
      ...(can(user, 'kanban.ver') ? [listarKanban().catch(error => setSyncError(error.message))] : []),
      ...(can(user, 'inventario.movimientos') ? [listarMovimientos({ tipo: 'venta' }).catch(error => setSyncError(error.message))] : []),
    ]);
  }
  function add(event) {
    event.preventDefault();
    if (!clienteSeleccionado || !can(user, 'pedidos.agregarItems') || pedido?.estado !== 'abierto' || productos.loading || productos.error) return;
    mutation.run(() => sincronizarOperacion(() => agregarItemPedido(id, form, productos.data || []), [refresh]), async () => setForm({ productos_id: '', cantidad_pedida: '' }), 'Producto agregado y stock actualizado.');
  }
  function cancel() {
    if (!cancelId || !can(user, 'pedidos.cancelarItem')) return;
    mutation.run(() => sincronizarOperacion(() => cancelarItemPedido(cancelId), [refresh]), async () => setCancelId(null), 'Producto cancelado y unidades devueltas al inventario.');
  }
  return <>
    <div className="pedido-overlay" onClick={() => { if (!mutation.busy) onClose(); }} />
    <aside className="pedido-drawer pedido-detail-modal" role="dialog" aria-modal="true" aria-label="Detalle de pedido">
      <div className="pedido-drawer-header"><div><h2>Detalle de pedido</h2>{pedido&&<p className="pedido-detail-mesa">Mesa {mesas.data?.find(m => m.id === pedido.mesas_id)?.numero ?? summary?.mesa_numero ?? pedido.mesas_id}</p>}</div><div className="pedido-detail-header-actions">{pedido&&<span className={`pedido-state-badge ${pedido.estado}`}>{pedido.estado}</span>}<button className="drawer-close" disabled={mutation.busy} onClick={onClose} aria-label="Cerrar detalle">×</button></div></div>
      <div className="pedido-detail-body">
      <OperacionRemoteState resource={detail}>
        {pedido && <>
          <p className="pedido-visual-id">Pedido: {pedido.id}</p>
          <dl className="operacion-info pedido-detail-info">
            <div><dt>Cliente</dt><dd>{(summary?.clientes_id === pedido.clientes_id ? summary.cliente_nombre || pedido.clientes_id : pedido.clientes_id) || 'Sin cliente registrado'}</dd></div>
            <div><dt>Responsable del pedido</dt><dd>{summary?.usuarios_id === pedido.usuarios_id ? summary.responsable_nombre || pedido.usuarios_id : pedido.usuarios_id}</dd></div>
            <div><dt>Creado</dt><dd>{formatDateTime(pedido.creado_en)}</dd></div>
          </dl>
          {pedido.estado==='cerrado'&&<ComprobantePedido pedidoId={id} estado={pedido.estado} mesaNumero={summary?.mesa_numero}/>}
          <PedidoParticipantes id={id} resource={participants} productos={productos.data || []} titulo={pedido.sesion_mesa_id ? 'Clientes en la mesa' : 'Clientes del pedido'} editable={can(user, 'pedidos.agregarItems') && pedido.estado === 'abierto'} />
          {<RondasConsumo key={id} sesionId={pedido.sesion_mesa_id} mesaId={pedido.mesas_id} pedidoId={id} editable={pedido.estado==='abierto'} version={pedido} onChanged={refresh} />}
          <section className="pedido-products"><h3>Productos del pedido</h3>
            {pedido.items.some(item => !item.participante_id) && <p className="pedido-client-warning" role="alert">Estos productos incluyen consumos históricos sin cliente identificado. Es necesario revisar su asociación; no se asignaron a otra persona.</p>}
            <div className="pedido-products-table" role="table" aria-label="Productos del pedido"><div className="pedido-product-head" role="row">{['Producto','Cantidad','Precio unitario','Subtotal','Estado','Acción'].map(label=><span role="columnheader" key={label}>{label}</span>)}</div>
            {pedido.items.map(item => <article className="operacion-item pedido-detail-line" role="row" key={item.id}>
              <div className="pedido-product-name" role="cell" data-label="Producto"><ProductoImagen url={item.imagen_url || productos.data?.find(p=>p.id===item.productos_id)?.imagen_url} nombre={item.nombre}/><strong>{item.nombre}</strong></div>
              <span role="cell" data-label="Cantidad">{item.cantidad_pedida}</span>
              <span role="cell" data-label="Precio unitario">{formatCurrency(item.precio_unitario)}</span>
              <span role="cell" data-label="Subtotal">{subtotalProducto(item)===null?'—':formatCurrency(subtotalProducto(item))}</span>
              <span role="cell" data-label="Estado"><span className={`pedido-state-badge ${item.estado}`}>{item.estado}</span></span>
              <span role="cell" data-label="Acción">{can(user, 'pedidos.cancelarItem') && pedido.estado === 'abierto' && ['enviado', 'preparando'].includes(item.estado) && <button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => { mutation.reset(); setCancelId(item.id); }}>Cancelar producto</button>}</span>
            </article>)}</div>
            {!pedido.items.length && <p>No hay productos en este pedido.</p>}
            {totalProductos!==null&&pedido.items.length>0&&<div className="pedido-products-total"><strong>Total productos</strong><strong>{formatCurrency(totalProductos)}</strong></div>}
          </section>
          {can(user, 'pedidos.agregarItems') && pedido.estado === 'abierto' && <section className="operacion-drawer-section"><h3>Agregar producto</h3>
            <OperacionRemoteState resource={productos} empty="No hay productos disponibles." />
            <form className="catalogo-form operacion-form pedido-add-form" onSubmit={add}><fieldset disabled={mutation.busy || productos.loading || Boolean(productos.error)}>
              <label>Cliente<select value={form.participante_id || ''} required aria-describedby={!clienteSeleccionado ? "pedido-cliente-requerido" : undefined} disabled={participants.loading || Boolean(participants.error)} onChange={e => setForm({ ...form, participante_id: e.target.value })}><option value="">Selecciona un cliente</option>{(participants.data || []).map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.tipo_participante === 'temporal' ? 'Temporal' : 'Registrado'}</option>)}</select></label>
              <label>Producto<select value={form.productos_id} onChange={event => setForm({ ...form, productos_id: event.target.value, cantidad_pedida: '' })} required><option value="">Selecciona un producto</option>{(productos.data || []).map(p => <option key={p.id} value={p.id} disabled={p.stock <= 0}>{p.codigo} — {p.nombre} — Stock: {p.stock}</option>)}</select></label>
              <label>Cantidad<input type="number" min="1" max={product?.stock ?? 2147483647} step="1" value={form.cantidad_pedida} onChange={event => setForm({ ...form, cantidad_pedida: event.target.value })} required /></label>
              <button className="drawer-primary-button" type="submit" disabled={!clienteSeleccionado || !product || product.stock <= 0}>{mutation.busy ? 'Guardando...' : 'Agregar producto'}</button>
              {product && <div className="pedido-add-preview"><ProductoImagen url={product.imagen_url} nombre={product.nombre}/><dl className="operacion-info"><div><dt>Código</dt><dd>{product.codigo}</dd></div><div><dt>Producto</dt><dd>{product.nombre}</dd></div><div><dt>Stock disponible</dt><dd>{product.stock}</dd></div><div><dt>Precio de venta</dt><dd>{formatCurrency(product.precio)}</dd></div></dl></div>}
              {!clienteSeleccionado && <p id="pedido-cliente-requerido" className="pedido-client-warning">Selecciona primero el cliente que pidió este producto.</p>}
            </fieldset></form>
          </section>}
        </>}
      </OperacionRemoteState>
      {cancelId && <section className="operacion-drawer-section"><p>¿Cancelar este producto y reintegrar sus unidades al inventario?</p><div className="operacion-actions"><button className="drawer-primary-button" disabled={mutation.busy} onClick={cancel}>{mutation.busy ? 'Procesando...' : 'Confirmar cancelación'}</button><button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => setCancelId(null)}>Volver</button></div></section>}
      {mutation.error && <p className="pedido-feedback" role="alert">{mutation.error}</p>}{mutation.success && <p className="pedido-feedback" role="status">{mutation.success}</p>}
      {syncError && <div role="alert"><p>La operación fue confirmada. No se pudo actualizar una consulta: {syncError}</p><button onClick={refresh}>Reintentar consultas</button></div>}
      </div>
    </aside>
  </>;
}
