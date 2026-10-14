import { useCallback, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';
import { listarClientes } from '../services/clientesService';
import { listarResponsables } from '../services/usuariosService';
import { crearPedido } from '../services/pedidosService';
import OperacionRemoteState from './OperacionRemoteState';
import './CatalogoForm.css';
import './OperacionForms.css';

export default function PedidoForm({ mesas, initialMesa = '', onClose, onCreated }) {
  const { user } = useAuth();
  const assignable = can(user, 'pedidos.asignarResponsable');
  const [form, setForm] = useState({ mesas_id: initialMesa, usuarios_id: '', clientes_id: '' });
  const responsableId = assignable ? form.usuarios_id : user?.id;
  const [query, setQuery] = useState({ pagina: 1, buscar: '', estado: 'activo' });
  const loader = useCallback(options => listarClientes(query, options), [query]);
  const clients = useRemoteCatalog(loader);
  const responsibleLoader = useCallback(options => assignable ? listarResponsables(options) : Promise.resolve([]), [assignable]);
  const responsible = useRemoteCatalog(responsibleLoader);
  const mutation = useCatalogMutation();
  const [validation, setValidation] = useState('');
  const ready = !mesas.loading && !mesas.error && !clients.loading && !clients.error && (!assignable || (!responsible.loading && !responsible.error));
  // Conservar el ID real confirmado para abrir el detalle después de la reconsulta.
  function submit(event) {
    event.preventDefault(); setValidation('');
    if (!can(user, 'pedidos.crear') || !ready) return;
    if (!mesas.data?.some(m => m.id === form.mesas_id) || !clients.data?.datos.some(c => c.id === form.clientes_id && c.estado === 'activo') || !responsableId || (assignable && !responsible.data?.some(u => u.id === responsableId && u.estado === 'activo'))) {
      setValidation('Selecciona una mesa, un cliente activo y un responsable reales.'); return;
    }
    let result;
    mutation.run(async () => { result = await crearPedido({ ...form, usuarios_id: responsableId }); }, async () => { await onCreated(result.id_pedido); }, 'Pedido creado correctamente.');
  }
  function changeQuery(next) { setQuery(next); setForm({ ...form, clientes_id: '' }); }
  return <>
    <div className="pedido-overlay" onClick={() => { if (!mutation.busy) onClose(); }} />
    <aside className="pedido-drawer" role="dialog" aria-modal="true" aria-label="Nuevo pedido">
      <div className="pedido-drawer-header"><h2>Nuevo pedido</h2><button className="drawer-close" disabled={mutation.busy} onClick={onClose} aria-label="Cerrar formulario">×</button></div>
      {[mesas, clients, ...(assignable ? [responsible] : [])].map((resource, index) => <OperacionRemoteState key={index} resource={resource} />)}
      <form className="catalogo-form operacion-form" onSubmit={submit}><fieldset disabled={mutation.busy}>
        <label>Mesa<select value={form.mesas_id} onChange={event => setForm({ ...form, mesas_id: event.target.value })} disabled={mesas.loading || Boolean(mesas.error)} required><option value="">Selecciona una mesa</option>{(mesas.data || []).map(m => <option key={m.id} value={m.id}>Mesa {m.numero} — {m.estado}</option>)}</select></label>
        <label>Buscar cliente<input type="search" value={query.buscar} onChange={event => changeQuery({ ...query, buscar: event.target.value, pagina: 1 })} placeholder="Nombre, email o teléfono" /></label>
        <label>Cliente<select value={form.clientes_id} onChange={event => setForm({ ...form, clientes_id: event.target.value })} disabled={clients.loading || Boolean(clients.error)} required><option value="">Selecciona un cliente activo</option>{(clients.data?.datos || []).filter(c => c.estado === 'activo').map(c => <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` — ${c.telefono}` : ''}</option>)}</select></label>
        {!clients.loading && !clients.error && !clients.data?.datos.length && <p>No hay clientes activos para esta búsqueda.</p>}
        <div className="catalogo-actions"><button type="button" disabled={clients.loading || query.pagina <= 1} onClick={() => changeQuery({ ...query, pagina: query.pagina - 1 })}>Anterior</button><span>Página {query.pagina}</span><button type="button" disabled={clients.loading || !clients.data || query.pagina * clients.data.limite >= clients.data.total} onClick={() => changeQuery({ ...query, pagina: query.pagina + 1 })}>Siguiente</button></div>
        {assignable ? <label>Responsable del pedido<select value={form.usuarios_id} onChange={event => setForm({ ...form, usuarios_id: event.target.value })} disabled={responsible.loading || Boolean(responsible.error)} required><option value="">Selecciona un responsable</option>{(responsible.data || []).map(u => <option key={u.id} value={u.id}>{u.nombre || u.id}</option>)}</select></label> : <div><p>Responsable del pedido</p><strong>{user?.nombre || user?.id}</strong><p>Asignado automáticamente a tu sesión</p></div>}
        {assignable && !responsible.loading && !responsible.error && !responsible.data?.length && <p>No hay responsables activos disponibles.</p>}
        <small>El responsable es quien atiende el pedido. La acción se registra con tu sesión actual.</small>
        {(validation || mutation.error) && <p role="alert">{validation || mutation.error}</p>}
        <button className="drawer-primary-button" type="submit" disabled={!ready || !form.mesas_id || !form.clientes_id || !responsableId}>{mutation.busy ? 'Guardando...' : 'Crear pedido'}</button>
      </fieldset></form>
    </aside>
  </>;
}
