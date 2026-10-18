import { useCallback, useState } from 'react';
import { crearCliente, listarClientes } from '../services/clientesService';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';

// Campos compartidos por alta de pedido y por incorporación de participantes.
// Sin form anidado: el alta de cliente se confirma con un botón independiente.
export default function ClientePedidoFields({ value, onChange, disabled, participante = false, compact = false }) {
  const [mode, setMode] = useState('registrado');
  const [query, setQuery] = useState({ pagina: 1, buscar: '', estado: 'activo' });
  const clients = useRemoteCatalog(useCallback(options => listarClientes(query, options), [query]));
  const mutation = useCatalogMutation();
  const [newClient, setNewClient] = useState({ nombre: '', telefono: '', email: '' });
  const [created, setCreated] = useState(null);
  function chooseMode(next) { setMode(next); onChange(null); mutation.reset(); }
  function register() {
    let cliente;
    return mutation.run(async () => { cliente = await crearCliente(newClient); }, async () => {
      setCreated(cliente); setMode('registrado'); onChange({ tipo_participante: 'registrado', clientes_id: cliente.id, nombre: cliente.nombre });
    }, 'Registrado.');
  }
  function selectClient(id) {
    const c = [created, ...(clients.data?.datos || [])].find(c => c?.id === id);
    onChange(c ? { tipo_participante: 'registrado', clientes_id: c.id, nombre: c.nombre } : null);
  }
  const selected = compact && mode === 'registrado' && value?.clientes_id;
  return <fieldset disabled={disabled || mutation.busy} className={`pedido-person-fields${compact ? ` pedido-person-fields-compact ${mode}` : ''}`}>
    {selected ? <div className="pedido-client-summary"><div><small>Cliente seleccionado</small><strong>{value.nombre}</strong></div><button type="button" className="drawer-secondary-button" onClick={() => onChange(null)}>Cambiar</button></div> : <>
    <label>Identidad<select value={mode} onChange={e => chooseMode(e.target.value)}>
      <option value="registrado">{participante ? 'Registrado' : 'Cliente recurrente'}</option><option value="nuevo">+ Registrar nuevo cliente</option><option value="temporal">{participante ? 'Cliente temporal' : 'Cliente temporal'}</option>
    </select></label>
    {mode === 'temporal' && <label>Nombre o alias<input maxLength={100} value={value?.nombre || ''} onChange={e => onChange({ tipo_participante: 'temporal', nombre: e.target.value })} required /></label>}
    {mode === 'registrado' && <>
      <label>Buscar cliente<input type="search" placeholder="Nombre, email o teléfono" value={query.buscar} onChange={e => { setQuery({ ...query, pagina: 1, buscar: e.target.value }); onChange(null); }} /></label>
      {clients.loading && <p role="status">Cargando información...</p>}
      {clients.error && <div role="alert"><p>{clients.error}</p><button type="button" className="drawer-secondary-button" onClick={clients.refresh}>Reintentar</button></div>}
      {compact ? <ul className="pedido-client-results" aria-label="Resultados de clientes">{[...(created && !clients.data?.datos.some(c => c.id === created.id) ? [created] : []), ...(clients.data?.datos || [])].filter(c => c.estado === 'activo').map(c => <li key={c.id}><strong>{c.nombre}</strong><button type="button" className="drawer-secondary-button" disabled={clients.loading || Boolean(clients.error)} onClick={() => selectClient(c.id)} aria-label={`Seleccionar a ${c.nombre}`}>Seleccionar</button></li>)}</ul> : <label>Cliente<select value={value?.clientes_id || ''} disabled={clients.loading || Boolean(clients.error)} onChange={e => selectClient(e.target.value)} required>
        <option value="">Selecciona un cliente activo</option>
        {[...(created && !clients.data?.datos.some(c => c.id === created.id) ? [created] : []), ...(clients.data?.datos || [])].filter(c => c.estado === 'activo').map(c => <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` — ${c.telefono}` : ''}</option>)}
      </select></label>}
      {!clients.loading && !clients.error && !created && !clients.data?.datos.length && <p>No hay clientes activos para esta búsqueda.</p>}
      <div className="catalogo-actions pedido-client-pagination"><button type="button" disabled={clients.loading || query.pagina <= 1} onClick={() => { setQuery({ ...query, pagina: query.pagina - 1 }); onChange(null); }}>Anterior</button><span>Página {query.pagina}{compact && clients.data ? ` de ${Math.max(1,Math.ceil(clients.data.total / clients.data.limite))}` : ''}</span><button type="button" disabled={clients.loading || !clients.data || query.pagina * clients.data.limite >= clients.data.total} onClick={() => { setQuery({ ...query, pagina: query.pagina + 1 }); onChange(null); }}>Siguiente</button></div>
    </>}
    {mode === 'nuevo' && <>
      <label>Nombre<input maxLength={100} value={newClient.nombre} onChange={e => setNewClient({ ...newClient, nombre: e.target.value })} /></label>
      <label>Teléfono (opcional)<input maxLength={20} value={newClient.telefono} onChange={e => setNewClient({ ...newClient, telefono: e.target.value })} /></label>
      <label>Email (opcional)<input type="email" maxLength={150} value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} /></label>
      <button type="button" className="drawer-secondary-button" disabled={!newClient.nombre.trim()} onClick={register}>{mutation.busy ? 'Registrando...' : 'Registrar cliente'}</button>
    </>}
    </>}
    {mutation.error && <p role="alert">{mutation.error}</p>}{mutation.success && <p role="status">{mutation.success}</p>}
  </fieldset>;
}
