import { useCallback, useMemo, useState } from 'react';
import { ShoppingCart, Clock3, CircleCheck, XCircle, Search, Plus, Building2 } from 'lucide-react';
import ProveedoresSection from '../components/ProveedoresSection';
import CompraForm from '../components/CompraForm';
import CompraDetalle from '../components/CompraDetalle';
import InventoryRemoteState, { InventoryPagination } from '../components/InventoryRemoteState';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/dateTime';
import { useRemoteCatalog } from '../hooks/useRemoteCatalog';
import { listarProveedores } from '../services/proveedoresService';
import { listarProductos } from '../services/productosService';
import { listarMovimientos } from '../services/inventarioService';
import { listarCompras, estadosCompra, crearIntentoRecepcion } from '../services/comprasService';
import './ComprasPage.css';

export default function ComprasPage() {
  const { user } = useAuth();
  const allowed = can(user, 'compras.ver');
  const [seccion, setSeccion] = useState('ordenes');
  const [query, setQuery] = useState({ pagina: 1 });
  const [busqueda, setBusqueda] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');
  const [intentos] = useState(crearIntentoRecepcion);
  const loader = useCallback(options => allowed ? listarCompras(query, options) : Promise.resolve(null), [allowed, query]);
  const providerLoader = useCallback(options => allowed ? listarProveedores(options) : Promise.resolve(null), [allowed]);
  const productLoader = useCallback(options => allowed ? listarProductos(options) : Promise.resolve(null), [allowed]);
  const orders = useRemoteCatalog(loader);
  const providers = useRemoteCatalog(providerLoader);
  const products = useRemoteCatalog(productLoader);
  const rows = useMemo(() => (orders.data?.datos || []).filter(row => [row.id, row.proveedores_id, providers.data?.find(p => p.id === row.proveedores_id)?.nombre].some(value => value?.toLowerCase().includes(busqueda.toLowerCase()))), [orders.data, providers.data, busqueda]);
  const filter = estado => setQuery({ ...query, estado: estado || undefined, pagina: 1 });
  async function changed() {
    await Promise.all([orders.refresh(), products.refresh(), listarMovimientos({ tipo: 'compra', pagina: 1 }).catch(error => {
      // La mutación ya está confirmada: un fallo de esta lectura no la convierte en fallida.
      setSuccess(`Operación confirmada. No se pudieron actualizar los movimientos: ${error.message}`);
    })]);
  }
  if (!allowed) return <p>No tienes permiso para consultar compras.</p>;
  return <div className="compras-page">
    <header className="compras-header"><div><p className="page-eyebrow">COMPRAS</p><h1 className="page-title">{seccion === 'ordenes' ? 'Órdenes de compra' : 'Proveedores'}</h1><p className="page-description">{seccion === 'ordenes' ? 'Gestiona compras y recepción de mercancía.' : 'Consulta y administra los datos de contacto de proveedores.'}</p></div>
      {seccion === 'ordenes' && can(user, 'compras.crear') && <button className="primary-button compras-primary-action" onClick={() => { setSuccess(''); setCreating(true); }}><Plus size={18} />Nueva compra</button>}
    </header>
    <nav className="compras-nav"><button className={seccion === 'ordenes' ? 'active' : ''} onClick={() => setSeccion('ordenes')}><ShoppingCart size={16} />Órdenes</button><button className={seccion === 'proveedores' ? 'active' : ''} onClick={() => setSeccion('proveedores')}><Building2 size={16} />Proveedores</button></nav>
    {seccion === 'proveedores' ? <ProveedoresSection /> : <>
      <section className="compras-kpis">
        {[[undefined, 'Órdenes en esta página', ShoppingCart], ['pendiente', 'Pendientes en esta página', Clock3], ['recibida', 'Recibidas en esta página', CircleCheck], ['cancelada', 'Canceladas en esta página', XCircle]].map(([estado, label, Icon]) => <button key={estado || 'todas'} className={`compra-kpi ${query.estado === estado ? 'selected' : ''}`} onClick={() => filter(estado)}><div className="compra-kpi-icon total"><Icon size={20} /></div><span>{label}</span><strong>{orders.loading || orders.error ? '—' : (orders.data?.datos || []).filter(row => !estado || row.estado === estado).length}</strong><small>Sobre el resultado consultado</small></button>)}
      </section>
      <section className="compras-toolbar"><div className="compras-filters">{[['', 'Todas'], ...Object.entries(estadosCompra)].map(([estado, label]) => <button key={estado} className={`filter-button ${(query.estado || '') === estado ? 'active' : ''}`} onClick={() => filter(estado)}>{label}</button>)}</div><div className="compras-search"><Search className="compras-search-icon" size={18} /><input aria-label="Buscar compras en esta página" placeholder="Buscar en esta página..." value={busqueda} onChange={event => setBusqueda(event.target.value)} /></div></section>
      {success && <p role="status">{success}</p>}
      {providers.error && <div role="alert"><p>{providers.error}</p><button onClick={providers.refresh}>Reintentar proveedores</button></div>}
      <InventoryRemoteState resource={orders} empty="No hay compras para mostrar."><section className="compras-panel"><div className="compras-panel-header"><div><h2>Historial de órdenes</h2><p>{rows.length} órdenes en esta página · {orders.data?.paginacion.total} compras</p></div></div><div className="compras-table-wrapper"><table className="compras-table"><thead><tr><th>Orden</th><th>Proveedor</th><th>Fecha</th><th>Total compra</th><th>Total recibido</th><th>Creador (ID)</th><th>Estado</th><th></th></tr></thead><tbody>
        {rows.map(row => <tr key={row.id}><td className="compra-real-id">{row.id}</td><td><strong>{providers.data?.find(p => p.id === row.proveedores_id)?.nombre || row.proveedores_id}</strong></td><td>{formatDateTime(row.creado_en)}</td><td>{formatCurrency(row.total_estimado)}</td><td>{formatCurrency(row.total_recibido)}</td><td className="compra-real-id">{row.usuarios_id}</td><td><span className={`compra-status ${row.estado}`}>{estadosCompra[row.estado]}</span></td><td><button className="compra-detail-button" onClick={() => setSelectedId(row.id)}>Ver detalle</button></td></tr>)}
        {!rows.length && <tr><td colSpan={8}>No hay coincidencias en esta página.</td></tr>}
      </tbody></table></div></section></InventoryRemoteState>
      <div className="compras-pagination"><InventoryPagination resource={{ ...orders, query, setQuery }} /></div>
    </>}
    {creating && <CompraForm proveedores={providers} productos={products} onClose={() => setCreating(false)} onCreated={async () => { await orders.refresh(); setSuccess('Compra pendiente creada correctamente.'); }} />}
    {selectedId && <CompraDetalle key={selectedId} id={selectedId} proveedores={providers} productos={products} intentos={intentos} onClose={() => setSelectedId(null)} onChanged={changed} />}
  </div>;
}
