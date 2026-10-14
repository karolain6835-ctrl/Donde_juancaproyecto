import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { formatCurrency } from '../utils/formatCurrency';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';
import { cuentaMesa, estadosMesa, trasladarMesa, cambiarEstadoMesa } from '../services/mesasService';
import { listarPedidos } from '../services/pedidosService';
import { listarKanban } from '../services/kanbanService';
import { sincronizarOperacion } from '../services/operacionContract';
import { InventoryPagination } from './InventoryRemoteState';
import OperacionRemoteState from './OperacionRemoteState';
import './CatalogoForm.css';
import './OperacionForms.css';

export default function MesaDetalle({ id, mesas, onClose, onCreate }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mesa = mesas.data?.find(row => row.id === id);
  const accountLoader = useCallback(options => cuentaMesa(id, options), [id]);
  const account = useRemoteCatalog(accountLoader);
  const [pagina, setPagina] = useState(1);
  const orderLoader = useCallback(options => listarPedidos({ mesas_id: id, estado: 'abierto', pagina }, options), [id, pagina]);
  const orders = useRemoteCatalog(orderLoader);
  const mutation = useCatalogMutation();
  const [destino, setDestino] = useState('');
  const [estado, setEstado] = useState('');
  const [syncError, setSyncError] = useState('');
  const refresh = async () => {
    setSyncError('');
    await Promise.all([mesas.refresh(), account.refresh(), orders.refresh(), ...(can(user, 'kanban.ver') ? [listarKanban().catch(error => setSyncError(error.message))] : [])]);
  };
  function transfer(event) {
    event.preventDefault();
    if (!can(user, 'mesas.trasladar') || !mesas.data?.some(m => m.id === destino && m.estado === 'disponible')) return;
    mutation.run(() => sincronizarOperacion(() => trasladarMesa({ mesa_origen_id: id, mesa_destino_id: destino }), [refresh]), async () => setDestino(''), 'Cuenta trasladada correctamente.');
  }
  function changeState(event) {
    event.preventDefault();
    if (!can(user, 'mesas.cambiarEstado')) return;
    mutation.run(() => sincronizarOperacion(() => cambiarEstadoMesa(id, estado), [refresh]), async () => setEstado(''), 'Estado de mesa actualizado.');
  }
  return <>
    <div className="mesa-overlay" onClick={() => { if (!mutation.busy) onClose(); }} />
    <aside className="mesa-drawer" role="dialog" aria-modal="true" aria-label="Detalle de mesa">
      <div className="mesa-drawer-header"><h2>Mesa {mesa?.numero ?? id}</h2><button className="drawer-close" disabled={mutation.busy} onClick={onClose} aria-label="Cerrar detalle">×</button></div>
      {mesa && <div className={`drawer-status ${mesa.estado}`}><span>Estado</span><strong>{estadosMesa[mesa.estado]}</strong></div>}
      <section className="operacion-drawer-section"><h3>Cuenta de la mesa</h3>
        <OperacionRemoteState resource={account}>{account.data && <>
          <dl className="operacion-info"><div><dt>Subtotal productos</dt><dd>{formatCurrency(account.data.resumen.subtotal_productos)}</dd></div><div><dt>Total cuenta</dt><dd>{formatCurrency(account.data.resumen.total_general)}</dd></div></dl>
          {account.data.detalle_productos.map((item, index) => <div className="operacion-item" key={`${item.producto_id}-${index}`}><strong>{item.nombre}</strong><p>{item.cantidad_pedida} × {formatCurrency(item.precio_unitario)}</p><p>Subtotal: {formatCurrency(item.subtotal)}</p></div>)}
          {!account.data.detalle_productos.length && <p>No hay productos pendientes en la cuenta.</p>}
        </>}</OperacionRemoteState>
      </section>
      <section className="operacion-drawer-section"><h3>Pedidos abiertos</h3><OperacionRemoteState resource={orders} empty="No hay pedidos abiertos en esta mesa.">
        {orders.data?.datos.map(p => <div className="operacion-item" key={p.id}><span className="operacion-id">{p.id}</span><p>{p.cliente_nombre || p.clientes_id}</p><p>Responsable: {p.responsable_nombre || p.usuarios_id}</p><button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => navigate(`/operacion/pedidos?pedido=${encodeURIComponent(p.id)}&mesa=${encodeURIComponent(id)}`)}>Ver pedido</button></div>)}
      </OperacionRemoteState><InventoryPagination resource={{ ...orders, query: { pagina }, setQuery: q => setPagina(q.pagina) }} /></section>
      {can(user, 'pedidos.crear') && <div className="operacion-actions"><button className="drawer-primary-button" disabled={mutation.busy} onClick={() => onCreate(id)}>Crear pedido en esta mesa</button></div>}
      {can(user, 'mesas.trasladar') && <form className="catalogo-form operacion-form" onSubmit={transfer}><fieldset disabled={mutation.busy || mesas.loading || Boolean(mesas.error)}><h3>Trasladar cuenta</h3><label>Mesa de destino<select value={destino} onChange={event => setDestino(event.target.value)} required><option value="">Selecciona una mesa disponible</option>{(mesas.data || []).filter(m => m.id !== id && m.estado === 'disponible').map(m => <option key={m.id} value={m.id}>Mesa {m.numero}</option>)}</select></label><button className="drawer-secondary-button" type="submit" disabled={!destino}>{mutation.busy ? 'Procesando...' : 'Trasladar cuenta'}</button></fieldset></form>}
      {can(user, 'mesas.cambiarEstado') && <form className="catalogo-form operacion-form" onSubmit={changeState}><fieldset disabled={mutation.busy}><h3>Cambiar estado</h3><label>Estado<select value={estado} onChange={event => setEstado(event.target.value)} required><option value="">Selecciona un estado</option>{Object.entries(estadosMesa).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="drawer-secondary-button" type="submit" disabled={!estado}>{mutation.busy ? 'Procesando...' : 'Guardar estado'}</button></fieldset></form>}
      {mutation.error && <p role="alert">{mutation.error}</p>}{mutation.success && <p role="status">{mutation.success}</p>}
      {syncError && <div role="alert"><p>La operación fue confirmada. No se pudo actualizar Kanban: {syncError}</p><button onClick={refresh}>Reintentar consultas</button></div>}
    </aside>
  </>;
}
