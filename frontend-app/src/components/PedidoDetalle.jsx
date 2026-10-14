import { useCallback, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/dateTime';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';
import { detallePedido, agregarItemPedido, cancelarItemPedido } from '../services/pedidosService';
import { listarKanban } from '../services/kanbanService';
import { listarMovimientos } from '../services/inventarioService';
import { sincronizarOperacion } from '../services/operacionContract';
import OperacionRemoteState from './OperacionRemoteState';
import PedidoParticipantes from './PedidoParticipantes';
import { listarParticipantes } from '../services/participantesService';
import './CatalogoForm.css';
import './OperacionForms.css';

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
  async function refresh() {
    setSyncError('');
    await Promise.all([detail.refresh(), participants.refresh(), productos.refresh(), mesas.refresh(), onChanged(),
      ...(can(user, 'kanban.ver') ? [listarKanban().catch(error => setSyncError(error.message))] : []),
      ...(can(user, 'inventario.movimientos') ? [listarMovimientos({ tipo: 'venta' }).catch(error => setSyncError(error.message))] : []),
    ]);
  }
  function add(event) {
    event.preventDefault();
    if (!can(user, 'pedidos.agregarItems') || pedido?.estado !== 'abierto' || productos.loading || productos.error) return;
    mutation.run(() => sincronizarOperacion(() => agregarItemPedido(id, form, productos.data || []), [refresh]), async () => setForm({ productos_id: '', cantidad_pedida: '' }), 'Producto agregado y stock actualizado.');
  }
  function cancel() {
    if (!cancelId || !can(user, 'pedidos.cancelarItem')) return;
    mutation.run(() => sincronizarOperacion(() => cancelarItemPedido(cancelId), [refresh]), async () => setCancelId(null), 'Ítem cancelado y stock reintegrado.');
  }
  return <>
    <div className="pedido-overlay" onClick={() => { if (!mutation.busy) onClose(); }} />
    <aside className="pedido-drawer" role="dialog" aria-modal="true" aria-label="Detalle de pedido">
      <div className="pedido-drawer-header"><h2>Detalle de pedido</h2><button className="drawer-close" disabled={mutation.busy} onClick={onClose} aria-label="Cerrar detalle">×</button></div>
      <OperacionRemoteState resource={detail}>
        {pedido && <>
          <div className="pedido-visual-header pedido-visual-header-detail"><strong>Mesa {mesas.data?.find(m => m.id === pedido.mesas_id)?.numero ?? summary?.mesa_numero ?? pedido.mesas_id}</strong><span className={`pedido-state-badge ${pedido.estado}`}>{pedido.estado}</span></div>
          <p className="pedido-visual-id">Pedido: {pedido.id}</p>
          <dl className="operacion-info">
            <div><dt>Cliente</dt><dd>{(summary?.clientes_id === pedido.clientes_id ? summary.cliente_nombre || pedido.clientes_id : pedido.clientes_id) || 'Sin cliente registrado'}</dd></div>
            <div><dt>Responsable del pedido</dt><dd>{summary?.usuarios_id === pedido.usuarios_id ? summary.responsable_nombre || pedido.usuarios_id : pedido.usuarios_id}</dd></div>
            <div><dt>Creado</dt><dd>{formatDateTime(pedido.creado_en)}</dd></div>
          </dl>
          <PedidoParticipantes id={id} resource={participants} titulo={pedido.sesion_mesa_id ? 'Participantes de la visita' : 'Participantes del pedido'} editable={can(user, 'pedidos.agregarItems') && pedido.estado === 'abierto'} />
          <section className="pedido-products"><h3>Productos del pedido</h3>
            {pedido.items.map(item => <article className="operacion-item pedido-detail-line" key={item.id}>
              {item.participante_nombre && <p className="pedido-line-person">{item.participante_nombre}</p>}
              <strong>{item.nombre}</strong><p>Cantidad: {item.cantidad_pedida}</p><p>Precio unitario: {formatCurrency(item.precio_unitario)}</p><p>Estado: {item.estado}</p>
              {can(user, 'pedidos.cancelarItem') && pedido.estado === 'abierto' && ['enviado', 'preparando'].includes(item.estado) && <button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => { mutation.reset(); setCancelId(item.id); }}>Cancelar ítem</button>}
            </article>)}
            {!pedido.items.length && <p>No hay productos en este pedido.</p>}
          </section>
          {can(user, 'pedidos.agregarItems') && pedido.estado === 'abierto' && <section className="operacion-drawer-section"><h3>Agregar producto</h3>
            <OperacionRemoteState resource={productos} empty="No hay productos disponibles." />
            <form className="catalogo-form operacion-form" onSubmit={add}><fieldset disabled={mutation.busy || productos.loading || Boolean(productos.error)}>
              <label>Participante<select value={form.participante_id || ''} disabled={participants.loading || Boolean(participants.error)} onChange={e => setForm({ ...form, participante_id: e.target.value })}><option value="">Sin asignar</option>{(participants.data || []).map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.tipo_participante === 'temporal' ? 'Temporal' : 'Registrado'}</option>)}</select></label>
              <label>Producto<select value={form.productos_id} onChange={event => setForm({ ...form, productos_id: event.target.value, cantidad_pedida: '' })} required><option value="">Selecciona un producto</option>{(productos.data || []).map(p => <option key={p.id} value={p.id} disabled={p.stock <= 0}>{p.codigo} — {p.nombre} — Stock: {p.stock}</option>)}</select></label>
              {product && <dl className="operacion-info"><div><dt>Código</dt><dd>{product.codigo}</dd></div><div><dt>Producto</dt><dd>{product.nombre}</dd></div><div><dt>Stock disponible</dt><dd>{product.stock}</dd></div><div><dt>Precio de venta</dt><dd>{formatCurrency(product.precio)}</dd></div></dl>}
              <label>Cantidad<input type="number" min="1" max={product?.stock ?? 2147483647} step="1" value={form.cantidad_pedida} onChange={event => setForm({ ...form, cantidad_pedida: event.target.value })} required /></label>
              <button className="drawer-primary-button" type="submit" disabled={!product || product.stock <= 0}>{mutation.busy ? 'Guardando...' : 'Agregar producto'}</button>
            </fieldset></form>
          </section>}
        </>}
      </OperacionRemoteState>
      {cancelId && <section className="operacion-drawer-section"><p>¿Cancelar este ítem y reintegrar sus unidades al inventario?</p><div className="operacion-actions"><button className="drawer-primary-button" disabled={mutation.busy} onClick={cancel}>{mutation.busy ? 'Procesando...' : 'Confirmar cancelación'}</button><button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => setCancelId(null)}>Volver</button></div></section>}
      {mutation.error && <p className="pedido-feedback" role="alert">{mutation.error}</p>}{mutation.success && <p className="pedido-feedback" role="status">{mutation.success}</p>}
      {syncError && <div role="alert"><p>La operación fue confirmada. No se pudo actualizar una consulta: {syncError}</p><button onClick={refresh}>Reintentar consultas</button></div>}
    </aside>
  </>;
}
