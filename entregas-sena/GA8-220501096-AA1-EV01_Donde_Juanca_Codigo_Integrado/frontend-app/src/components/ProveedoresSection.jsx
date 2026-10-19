import HistorialComprasProveedor from './HistorialComprasProveedor';
import { useMemo, useState } from 'react';
import { Plus, Search, Phone, Mail, Building2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import Can from './Can';
import CatalogoForm from './CatalogoForm';
import { listarProveedores, crearProveedor, actualizarProveedor } from '../services/proveedoresService';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';

const fields = [
  { name: 'contacto_nombre', label: 'Nombre del contacto', maxLength: 100 },
  { name: 'telefono', label: 'Teléfono', maxLength: 20 },
  { name: 'email', label: 'Correo electrónico', maxLength: 150 },
  { name: 'estado', label: 'Estado', options: ['activo', 'inactivo'] },
];
const empty = { contacto_nombre: '', telefono: '', email: '', estado: 'activo' };

export default function ProveedoresSection() {
  const { user } = useAuth();
  const catalog = useRemoteCatalog(listarProveedores);
  const mutation = useCatalogMutation();
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');
  const [editor, setEditor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [history,setHistory]=useState(null);
  const rows = useMemo(() => (catalog.data || []).filter(row => (estado === 'todos' || row.estado === estado) &&
    [row.nombre, row.contacto_nombre, row.email, row.telefono].some(value => (value || '').toLowerCase().includes(busqueda.toLowerCase()))), [catalog.data, busqueda, estado]);
  const open = row => { if (mutation.busy) return; mutation.reset(); setSelected(null); setEditor({ id: row?.id, initial: row || empty }); };
  const save = form => {
    if (!can(user, editor.id ? 'proveedores.editar' : 'proveedores.crear')) return;
    mutation.run(() => editor.id ? actualizarProveedor(editor.id, form) : crearProveedor(form), async () => { setEditor(null); await catalog.refresh(); }, editor.id ? 'Proveedor actualizado correctamente.' : 'Proveedor creado correctamente.');
  };
  const toggle = row => {
    if (!can(user, 'proveedores.editar')) return;
    mutation.run(() => actualizarProveedor(row.id, { estado: row.estado === 'activo' ? 'inactivo' : 'activo' }), async () => { setSelected(null); await catalog.refresh(); }, 'Estado del proveedor actualizado correctamente.');
  };
  if(history)return <HistorialComprasProveedor key={history.id} proveedor={history} onClose={()=>{setSelected(history);setHistory(null);}}/>;
  return <>
    <section className="compras-toolbar"><div className="proveedores-summary"><select aria-label="Filtrar proveedores por estado" value={estado} onChange={event => setEstado(event.target.value)}><option value="todos">Todos</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></div><div className="compras-search"><Search size={17} /><input placeholder="Buscar proveedor..." aria-label="Buscar proveedor" value={busqueda} onChange={event => setBusqueda(event.target.value)} /></div><Can permission="proveedores.crear"><button className="primary-button" disabled={mutation.busy} onClick={() => open(null)}><Plus size={18} />Nuevo proveedor</button></Can></section>
    {mutation.success && <p role="status">{mutation.success}</p>}{mutation.error && !editor && <p role="alert">{mutation.error}</p>}
    {catalog.loading ? <p role="status">Cargando proveedores...</p> : catalog.error ? <div role="alert"><p>{catalog.error}</p><button className="text-button" onClick={catalog.refresh}>Reintentar</button></div> : <section className="proveedores-grid">
      {!rows.length && <p>No hay proveedores para mostrar.</p>}
      {rows.map(row => <article className="proveedor-card" key={row.id}><div className="proveedor-card-icon"><Building2 size={22} /></div><div className="proveedor-card-header"><h3>{row.nombre}</h3><span className={`proveedor-status ${row.estado}`}>{row.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></div><div className="proveedor-info"><Phone size={16} />{row.telefono || '—'}</div><div className="proveedor-info"><Mail size={16} />{row.email || '—'}</div><div className="proveedor-card-footer"><button className="proveedor-detail-button" onClick={() => { mutation.reset(); setSelected(row); }}>Ver detalle</button><Can permission="proveedores.editar"><button className="proveedor-toggle-button" disabled={mutation.busy} onClick={() => toggle(row)}>{row.estado === 'activo' ? 'Desactivar' : 'Activar'}</button></Can></div></article>)}
    </section>}
    {selected && <><div className="compra-overlay" onClick={() => setSelected(null)} /><aside className="compra-drawer"><div className="compra-drawer-header"><h2>{selected.nombre}</h2><button className="drawer-close" aria-label="Cerrar detalle" onClick={() => setSelected(null)}>×</button></div><div className="compra-detail-grid"><p>Contacto: {selected.contacto_nombre || '—'}</p><p>Teléfono: {selected.telefono || '—'}</p><p>Correo: {selected.email || '—'}</p><p>Estado: {selected.estado === 'activo' ? 'Activo' : 'Inactivo'}</p></div><Can permission="proveedores.editar"><button className="drawer-primary-button" onClick={() => open(selected)}>Editar proveedor</button></Can><button className="drawer-secondary-button" onClick={()=>{setHistory(selected);setSelected(null);}}>Ver historial de compras</button></aside></>}
    {editor && can(user, editor.id ? 'proveedores.editar' : 'proveedores.crear') && <CatalogoForm title={editor.id ? 'Editar proveedor' : 'Nuevo proveedor'} prefix="compra" initial={editor.initial} fields={fields} busy={mutation.busy} error={mutation.error} onSave={save} onClose={() => setEditor(null)} />}
  </>;
}
