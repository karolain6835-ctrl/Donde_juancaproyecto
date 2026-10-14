import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { formatDateTime } from '../utils/dateTime';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';
import { listarPedidosKanban, estadosPedidoKanban, aceptarPedidoKanban, despacharTodoPedido, moverTarjeta } from '../services/kanbanService';
import { detallePedido } from '../services/pedidosService';
import { sincronizarOperacion } from '../services/operacionContract';
import OperacionRemoteState from '../components/OperacionRemoteState';
import './KanbanPage.css';
import '../components/OperacionForms.css';

export default function KanbanPage() {
  const { user } = useAuth();
  const allowed = can(user, 'kanban.ver');
  const loader = useCallback(options => allowed ? listarPedidosKanban(options) : Promise.resolve(null), [allowed]);
  const board = useRemoteCatalog(loader);
  const mutation = useCatalogMutation();
  const [buscar, setBuscar] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [affectedPedidoId, setAffectedPedidoId] = useState(null);
  const rows = (board.data || []).filter(row => [row.pedido_id, row.responsable, `mesa ${row.mesa}`, ...row.items.map(item => item.producto)].some(value => (value || '').toLowerCase().includes(buscar.toLowerCase())));
  const selected = board.data?.find(p => p.pedido_id === selectedId);
  async function refreshPedido(id) {
    setSyncError(''); setAffectedPedidoId(id);
    if (can(user, 'pedidos.ver')) {
      try { await detallePedido(id); }
      catch (error) { setSyncError(error.message); }
    }
  }
  function act(pedido, operation, message) {
    if (!can(user, 'kanban.actualizar')) return;
    mutation.run(() => sincronizarOperacion(operation, [board.refresh, () => refreshPedido(pedido.pedido_id)]), async () => {}, message);
  }
  function actions(pedido, detailed = false) {
    const enviado = pedido.items.some(item => item.estado === 'enviado');
    const preparando = pedido.items.some(item => item.estado === 'preparando');
    return <div className="kanban-card-actions">
      {can(user, 'kanban.actualizar') && enviado && <button className="kanban-action primary" disabled={mutation.busy || board.loading} onClick={() => act(pedido, () => aceptarPedidoKanban(pedido.pedido_id), 'Pedido aceptado correctamente.')}>Aceptar pedido</button>}
      {can(user, 'kanban.actualizar') && !enviado && preparando && <button className="kanban-action primary kanban-dispatch-action" disabled={mutation.busy || board.loading} onClick={() => act(pedido, () => despacharTodoPedido(pedido.pedido_id), 'Despacho confirmado.')}>Despachar todo</button>}
      <div className="kanban-secondary-actions">
      {!detailed && <button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => setSelectedId(pedido.pedido_id)}>Ver detalle</button>}
      {can(user, 'pedidos.ver') && <Link className="drawer-secondary-button pedido-navigation-button" to={`/operacion/pedidos?pedido=${encodeURIComponent(pedido.pedido_id)}`}>Ver pedido</Link>}
      </div>
    </div>;
  }
  function lines(pedido, detailed = false) {
    return <ul className="kanban-order-lines">{pedido.items.filter(item => detailed || item.estado !== 'cancelado').map(item => <li key={item.pedido_item_id}>
      <div><strong>{item.producto}</strong><span>Cantidad: {item.cantidad_pedida}</span><span>Estado: {estadosPedidoKanban[item.estado] || item.estado}</span></div>
      {detailed && can(user, 'kanban.actualizar') && item.estado === 'preparando' && <button className="kanban-action success" disabled={mutation.busy || board.loading} onClick={() => act(pedido, () => moverTarjeta({ id_item: item.pedido_item_id, estado: item.estado }, 'servido'), 'Línea servida correctamente.')}>Marcar línea servida</button>}
    </li>)}</ul>;
  }
  if (!allowed) return <p>No tienes permiso para consultar Kanban.</p>;
  return <div className="kanban-page">
    <header className="kanban-header"><div><p className="page-eyebrow">OPERACIÓN</p><h1 className="page-title">Kanban</h1><p className="page-description">Seguimiento de pedidos completos por mesa.</p></div></header>
    <section className="kanban-toolbar"><input className="operacion-search" aria-label="Buscar en Kanban" placeholder="Buscar producto, mesa o pedido..." value={buscar} onChange={event => setBuscar(event.target.value)} /><button className="drawer-secondary-button" disabled={board.loading || mutation.busy} onClick={board.refresh}>Actualizar tablero</button></section>
    {!selectedId && mutation.error && <p className="pedido-feedback" role="alert">{mutation.error}</p>}{!selectedId && mutation.success && <p className="pedido-feedback" role="status">{mutation.success}</p>}
    {syncError && <div role="alert"><p>Estado confirmado. No se pudo reconsultar el pedido: {syncError}</p><button onClick={() => refreshPedido(affectedPedidoId)}>Reintentar pedido</button></div>}
    <OperacionRemoteState resource={board} empty="No hay comandas para mostrar."><section className="kanban-board operacion-kanban-board">
      {Object.entries(estadosPedidoKanban).map(([estado, label]) => <article key={estado} className={`kanban-column ${estado}`}><div className="kanban-column-header"><h2>{label}</h2><span className="kanban-count">{rows.filter(row => row.estado_derivado === estado).length}</span></div><div className="kanban-column-content">
        {rows.filter(row => row.estado_derivado === estado).map(pedido => <article className="kanban-card" key={pedido.pedido_id}><div className="pedido-visual-header"><strong>Mesa {pedido.mesa}</strong><span className={`pedido-state-badge ${pedido.estado_derivado}`}>{estadosPedidoKanban[pedido.estado_derivado]}</span></div><div className="kanban-card-body"><p className="pedido-visual-id">Pedido: {pedido.pedido_id}</p><p className="pedido-visual-meta">{formatDateTime(pedido.creado_en)}</p><p className="pedido-visual-meta">Responsable: {pedido.responsable || pedido.responsable_id}</p>{lines(pedido)}</div>{actions(pedido)}</article>)}
        {!rows.some(row => row.estado_derivado === estado) && <div className="kanban-empty">Sin pedidos</div>}
      </div></article>)}
    </section></OperacionRemoteState>
    {selectedId && <><div className="pedido-overlay" onClick={() => { if (!mutation.busy) setSelectedId(null); }} /><aside className="pedido-drawer" role="dialog" aria-modal="true" aria-label="Detalle Kanban del pedido"><div className="pedido-drawer-header"><h2>Detalle del pedido</h2><button className="drawer-close" disabled={mutation.busy} onClick={() => setSelectedId(null)} aria-label="Cerrar detalle">×</button></div>
      {board.loading ? <p role="status">Actualizando pedido...</p> : board.error ? <OperacionRemoteState resource={board} /> : selected ? <><div className="pedido-visual-header pedido-visual-header-detail"><strong>Mesa {selected.mesa}</strong><span className={`pedido-state-badge ${selected.estado_derivado}`}>{estadosPedidoKanban[selected.estado_derivado]}</span></div><p className="pedido-visual-id">Pedido: {selected.pedido_id}</p>{lines(selected, true)}{actions(selected, true)}</> : <p>El pedido ya no tiene líneas operativas en el tablero.</p>}
      {mutation.error && <p className="pedido-feedback" role="alert">{mutation.error}</p>}{mutation.success && <p className="pedido-feedback" role="status">{mutation.success}</p>}
    </aside></>}
  </div>;
}
