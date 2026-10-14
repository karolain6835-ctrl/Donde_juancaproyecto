import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import MesaCuentaResumen from './MesaCuentaResumen';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';
import { cuentaMesa, estadosMesa, trasladarMesa, cambiarEstadoMesa, consultarLiberacionMesa } from '../services/mesasService';
import { listarPedidos } from '../services/pedidosService';
import { listarKanban } from '../services/kanbanService';
import { sincronizarOperacion } from '../services/operacionContract';
import { InventoryPagination } from './InventoryRemoteState';
import OperacionRemoteState from './OperacionRemoteState';
import './CatalogoForm.css';
import './OperacionForms.css';

export default function MesaDetalle({ id, mesas, onClose, onCreate, onEdit }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mesa = mesas.data?.find(row => row.id === id);
  const accountLoader = useCallback(options => cuentaMesa(id, options), [id]);
  const account = useRemoteCatalog(accountLoader);
  const [pagina, setPagina] = useState(1);
  const orderLoader = useCallback(options => listarPedidos({ mesas_id: id, estado: 'abierto', pagina }, options), [id, pagina]);
  const orders = useRemoteCatalog(orderLoader);
  const releaseLoader = useCallback(options => can(user, 'mesas.cambiarEstado') ? consultarLiberacionMesa(id, options) : Promise.resolve(null), [id, user]);
  const release = useRemoteCatalog(releaseLoader);
  const mutation = useCatalogMutation();
  const [destino, setDestino] = useState('');
  const [estado, setEstado] = useState('');
  const [syncError, setSyncError] = useState('');
  const refresh = async () => {
    setSyncError('');
    await Promise.all([mesas.refresh(), account.refresh(), orders.refresh(), release.refresh(), ...(can(user, 'kanban.ver') ? [listarKanban().catch(error => setSyncError(error.message))] : [])]);
  };
  function transfer(event) {
    event.preventDefault();
    if (!can(user, 'mesas.trasladar') || !mesas.data?.some(m => m.id === destino && m.estado === 'disponible')) return;
    mutation.run(() => sincronizarOperacion(() => trasladarMesa({ mesa_origen_id: id, mesa_destino_id: destino }), [refresh]), async () => setDestino(''), 'Cuenta trasladada correctamente.');
  }
  function changeState(event, next = estado) {
    event.preventDefault();
    if (!can(user, 'mesas.cambiarEstado')) return;
    mutation.run(() => sincronizarOperacion(() => cambiarEstadoMesa(id, next), [refresh]), async () => setEstado(''), 'Estado de mesa actualizado.');
  }
  return <>
    <div className="mesa-overlay" onClick={() => { if (!mutation.busy) onClose(); }} />
    <aside className="mesa-drawer" role="dialog" aria-modal="true" aria-label="Detalle de mesa">
      <div className="mesa-drawer-header"><h2>Mesa {mesa?.numero ?? id}</h2><button className="drawer-close" disabled={mutation.busy} onClick={onClose} aria-label="Cerrar detalle">×</button></div>
      {mesa && <div className={`drawer-status ${mesa.estado}`}><span>Estado</span><strong>{estadosMesa[mesa.estado]}</strong></div>}
      {onEdit && can(user, 'mesas.editarNumero') && <button className="drawer-secondary-button" disabled={mutation.busy} onClick={onEdit}>Cambiar número</button>}
      <section className="operacion-drawer-section"><h3>Cuenta de la mesa</h3>
        <OperacionRemoteState resource={account}>{account.data && <MesaCuentaResumen cuenta={account.data} />}</OperacionRemoteState>
      </section>
      <section className="operacion-drawer-section"><h3>Pedidos abiertos</h3><OperacionRemoteState resource={orders} empty="No hay pedidos abiertos en esta mesa.">
        {orders.data?.datos.map(p => <div className="operacion-item" key={p.id}><span className="operacion-id">{p.id}</span><p>{p.cliente_nombre || p.clientes_id}</p><p>Responsable: {p.responsable_nombre || p.usuarios_id}</p><button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => navigate(`/operacion/pedidos?pedido=${encodeURIComponent(p.id)}&mesa=${encodeURIComponent(id)}`)}>Ver pedido</button></div>)}
      </OperacionRemoteState><InventoryPagination resource={{ ...orders, query: { pagina }, setQuery: q => setPagina(q.pagina) }} /></section>
      {can(user, 'pedidos.crear') && <div className="operacion-actions"><button className="drawer-primary-button" disabled={mutation.busy} onClick={() => onCreate(id)}>Crear pedido en esta mesa</button></div>}
      {can(user, 'mesas.trasladar') && <form className="catalogo-form operacion-form" onSubmit={transfer}><fieldset disabled={mutation.busy || mesas.loading || Boolean(mesas.error)}><h3>Trasladar cuenta</h3><label>Mesa de destino<select value={destino} onChange={event => setDestino(event.target.value)} required><option value="">Selecciona una mesa disponible</option>{(mesas.data || []).filter(m => m.id !== id && m.estado === 'disponible').map(m => <option key={m.id} value={m.id}>Mesa {m.numero}</option>)}</select></label><button className="drawer-secondary-button" type="submit" disabled={!destino}>{mutation.busy ? 'Procesando...' : 'Trasladar cuenta'}</button></fieldset></form>}
      {can(user, 'mesas.cambiarEstado') && <section className="operacion-drawer-section"><div className="operacion-actions">
        {mesa?.estado === 'disponible' ? <button className="drawer-primary-button" disabled={mutation.busy || mesas.loading} onClick={event => changeState(event, 'ocupada')}>Ocupar mesa</button> : <button className="drawer-secondary-button" disabled={mutation.busy || mesas.loading || release.loading || Boolean(release.error) || !release.data?.puede_liberarse} onClick={event => changeState(event, 'disponible')}>Liberar mesa</button>}
      </div><OperacionRemoteState resource={release} />{release.data?.motivo && <p>{release.data.motivo}</p>}
      <form className="catalogo-form operacion-form" onSubmit={changeState}><fieldset disabled={mutation.busy}><h3>Cambiar estado</h3><label>Estado<select value={estado} onChange={event => setEstado(event.target.value)} required><option value="">Selecciona un estado</option>{Object.entries(estadosMesa).map(([value, label]) => <option key={value} value={value} disabled={value === 'disponible' && (!release.data?.puede_liberarse || release.loading || Boolean(release.error))}>{label}</option>)}</select></label><button className="drawer-secondary-button" type="submit" disabled={!estado || (estado === 'disponible' && (!release.data?.puede_liberarse || release.loading || Boolean(release.error)))}>{mutation.busy ? 'Procesando...' : 'Guardar estado'}</button></fieldset></form></section>}
      {mutation.error && <p role="alert">{mutation.error}</p>}{mutation.success && <p role="status">{mutation.success}</p>}
      {syncError && <div role="alert"><p>La operación fue confirmada. No se pudo actualizar Kanban: {syncError}</p><button onClick={refresh}>Reintentar consultas</button></div>}
    </aside>
  </>;
}
