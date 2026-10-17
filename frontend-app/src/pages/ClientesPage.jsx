import { useCallback, useState } from 'react';
import { Users, Plus, Search, History } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import Can from '../components/Can';
import CatalogoForm from '../components/CatalogoForm';
import HistorialClientesSection from '../components/HistorialClientesSection';
import { listarClientes, crearCliente, actualizarCliente } from '../services/clientesService';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';
import './ClientesPage.css';

const fields = [
  { name: 'nombre', label: 'Nombre', required: true, maxLength: 100 },
  { name: 'email', label: 'Correo electrónico', type: 'email', maxLength: 150 },
  { name: 'telefono', label: 'Teléfono', maxLength: 20 },
];
const empty = { nombre: '', email: '', telefono: '' };

export default function ClientesPage() {
  const { user } = useAuth();
  const [seccionActiva, setSeccionActiva] = useState('lista');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [editor, setEditor] = useState(null);
  const [clienteHistorial,setClienteHistorial]=useState(null);
  const loader = useCallback(options => listarClientes({ buscar: busqueda, estado: filtroEstado, pagina }, options), [busqueda, filtroEstado, pagina]);
  const catalog = useRemoteCatalog(loader);
  const mutation = useCatalogMutation();
  const rows = catalog.data?.datos || [];
  const open = cliente => { if (mutation.busy) return; mutation.reset(); setClienteSeleccionado(null); setEditor({ id: cliente?.id, initial: cliente || empty }); };
  const save = form => {
    if (!can(user, editor.id ? 'clientes.actualizar' : 'clientes.crear')) return;
    mutation.run(() => editor.id ? actualizarCliente(editor.id, form) : crearCliente(form), async () => {
      setEditor(null); await catalog.refresh();
    }, editor.id ? 'Cliente actualizado correctamente.' : 'Cliente creado correctamente.');
  };
  const cambiarEstado = cliente => {
    if (!can(user, 'clientes.actualizar')) return;
    mutation.run(() => actualizarCliente(cliente.id, { estado: cliente.estado === 'activo' ? 'inactivo' : 'activo' }), async () => {
      setClienteSeleccionado(null); await catalog.refresh();
    }, 'Estado del cliente actualizado correctamente.');
  };
  return <div className="clientes-page">
    <header className="clientes-header"><div><p className="page-eyebrow">CLIENTES</p><h1 className="page-title">{seccionActiva === 'lista' ? 'Lista de clientes' : 'Historial de consumo'}</h1><p className="page-description">Consulta y administra los datos de contacto de tus clientes.</p></div>
      {seccionActiva === 'lista' && <Can permission="clientes.crear"><button className="primary-button clientes-new-button" disabled={mutation.busy} onClick={() => open(null)}><Plus size={18} />Nuevo cliente</button></Can>}
    </header>
    <nav className="clientes-nav"><button className={seccionActiva === 'lista' ? 'active' : ''} onClick={() => setSeccionActiva('lista')}><Users size={16} />Clientes</button><button className={seccionActiva === 'historial' ? 'active' : ''} onClick={() => setSeccionActiva('historial')}><History size={16} />Historial</button></nav>
    {mutation.success && <p role="status">{mutation.success}</p>}
    {mutation.error && !editor && <p role="alert">{mutation.error}</p>}
    {seccionActiva === 'lista' && <>
      <section className="clientes-toolbar"><div className="clientes-filters">{['todos', 'activo', 'inactivo'].map(estado => <button key={estado} className={filtroEstado === estado ? 'filter-button active' : 'filter-button'} onClick={() => { setFiltroEstado(estado); setPagina(1); }}>{estado === 'todos' ? 'Todos' : estado === 'activo' ? 'Activos' : 'Inactivos'}</button>)}</div>
        <div className="clientes-search"><Search size={17} /><input aria-label="Buscar clientes" placeholder="Buscar por nombre, correo o teléfono..." maxLength={150} value={busqueda} onChange={event => { setBusqueda(event.target.value); setPagina(1); }} /></div>
      </section>
      {catalog.loading ? <p role="status">Cargando clientes...</p> : catalog.error ? <div role="alert"><p>{catalog.error}</p><button className="text-button" onClick={catalog.refresh}>Reintentar</button></div> :
        <section className="clientes-panel"><div className="clientes-panel-header"><div className="clientes-panel-title"><div className="clientes-panel-icon"><Users size={18} /></div><div><h2>Directorio de clientes</h2><p>{catalog.data?.total ?? 0} clientes encontrados</p></div></div></div>
          <div className="clientes-table-wrapper"><table className="clientes-table"><thead><tr><th>Cliente</th><th>Correo</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead><tbody>
            {rows.map(cliente => <tr key={cliente.id}><td><div className="cliente-name-cell"><strong>{cliente.nombre}</strong></div></td><td>{cliente.email || '—'}</td><td>{cliente.telefono || '—'}</td><td><span className={`cliente-status ${cliente.estado}`}>{cliente.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td><td><button className="cliente-detail-button" onClick={() => { mutation.reset(); setClienteSeleccionado(cliente); }}>Ver detalle</button></td></tr>)}
            {!rows.length && <tr><td colSpan={5}>No hay clientes para mostrar.</td></tr>}
          </tbody></table></div>
          <div className="catalogo-actions"><button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>Página {pagina}</span><button disabled={!catalog.data || pagina * catalog.data.limite >= catalog.data.total} onClick={() => setPagina(pagina + 1)}>Siguiente</button></div>
        </section>}
    </>}
    {seccionActiva === 'historial' && <HistorialClientesSection key={clienteHistorial?.id} cliente={clienteHistorial} />}
    {clienteSeleccionado && <><div className="cliente-overlay" onClick={() => { if (!mutation.busy) setClienteSeleccionado(null); }} /><aside className="cliente-drawer"><div className="cliente-drawer-header"><h2>{clienteSeleccionado.nombre}</h2><button className="drawer-close" disabled={mutation.busy} onClick={() => setClienteSeleccionado(null)} aria-label="Cerrar detalle">×</button></div><div className="cliente-detail-grid"><p>Correo: {clienteSeleccionado.email || '—'}</p><p>Teléfono: {clienteSeleccionado.telefono || '—'}</p><span className={`cliente-status ${clienteSeleccionado.estado}`}>{clienteSeleccionado.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></div>
      <button className="drawer-secondary-button" onClick={()=>{setClienteHistorial(clienteSeleccionado);setClienteSeleccionado(null);setSeccionActiva('historial');}}>Ver historial</button>
      <Can permission="clientes.actualizar"><div className="catalogo-actions"><button className="drawer-primary-button" disabled={mutation.busy} onClick={() => open(clienteSeleccionado)}>Editar cliente</button><button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => cambiarEstado(clienteSeleccionado)}>{clienteSeleccionado.estado === 'activo' ? 'Desactivar cliente' : 'Activar cliente'}</button></div></Can>
      {mutation.error && <p role="alert">{mutation.error}</p>}
    </aside></>}
    {editor && can(user, editor.id ? 'clientes.actualizar' : 'clientes.crear') && <CatalogoForm title={editor.id ? 'Editar cliente' : 'Nuevo cliente'} prefix="cliente" initial={editor.initial} fields={editor.id ? [...fields, { name: 'estado', label: 'Estado', options: ['activo', 'inactivo'] }] : fields} busy={mutation.busy} error={mutation.error} onSave={save} onClose={() => setEditor(null)} />}
  </div>;
}
