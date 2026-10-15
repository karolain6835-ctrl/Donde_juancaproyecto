import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { formatDateTime } from '../utils/dateTime';
import { useRemoteCatalog } from '../hooks/useRemoteCatalog';
import { listarPedidos, estadosPedido } from '../services/pedidosService';
import { listarMesas } from '../services/mesasService';
import { listarProductos } from '../services/productosService';
import PedidoForm from '../components/PedidoForm';
import PedidoDetalle from '../components/PedidoDetalle';
import OperacionRemoteState from '../components/OperacionRemoteState';
import { InventoryPagination } from '../components/InventoryRemoteState';
import './PedidosPage.css';
import '../components/OperacionForms.css';

export default function PedidosPage() {
  const { user } = useAuth();
  const allowed = can(user, 'pedidos.ver');
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState({ pagina: 1, mesas_id: params.get('mesa') || undefined });
  const selectedId = params.get('pedido');
  const [creating, setCreating] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [success, setSuccess] = useState('');
  const loader = useCallback(options => allowed ? listarPedidos(query, options) : Promise.resolve(null), [allowed, query]);
  const mesaLoader = useCallback(options => allowed ? listarMesas(options) : Promise.resolve(null), [allowed]);
  const productLoader = useCallback(options => allowed ? listarProductos(options) : Promise.resolve(null), [allowed]);
  const orders = useRemoteCatalog(loader), mesas = useRemoteCatalog(mesaLoader), productos = useRemoteCatalog(productLoader);
  function select(id) { const next = new URLSearchParams(params); if (id) next.set('pedido', id); else next.delete('pedido'); setParams(next); }
  const rows = (orders.data?.datos || []).filter(p => [p.id, p.cliente_nombre, p.responsable_nombre, `mesa ${p.mesa_numero}`].some(value => value?.toLowerCase().includes(buscar.trim().toLowerCase())));
  if (!allowed) return <p>No tienes permiso para consultar pedidos.</p>;
  return <div className="pedidos-page">
    <header className="pedidos-header"><div><p className="page-eyebrow">OPERACIÓN</p><h1 className="page-title">Pedidos</h1><p className="page-description">Consulta pedidos y agrega productos a las cuentas.</p></div>{can(user, 'pedidos.crear') && <button className="primary-button pedidos-new-button" onClick={() => { setSuccess(''); setCreating(true); }}><Plus size={18} />Nuevo pedido</button>}</header>
    <section className="pedidos-toolbar"><div className="pedido-filters">{[['', 'Todos'], ...Object.entries(estadosPedido)].map(([estado, label]) => <button className={`filter-button ${(query.estado || '') === estado ? 'active' : ''}`} key={estado} onClick={() => setQuery({ ...query, estado: estado || undefined, pagina: 1 })}>{label}</button>)}</div><div className="pedido-search"><Search className="pedido-search-icon" size={18} /><input aria-label="Buscar pedidos en esta página" placeholder="Buscar en esta página..." value={buscar} onChange={event => setBuscar(event.target.value)} /></div></section>
    <label className="operacion-mesa-filter">Mesa<select value={query.mesas_id || ''} disabled={mesas.loading || Boolean(mesas.error)} onChange={event => setQuery({ ...query, mesas_id: event.target.value || undefined, pagina: 1 })}><option value="">Todas las mesas</option>{(mesas.data || []).map(m => <option key={m.id} value={m.id}>Mesa {m.numero}</option>)}</select></label>
    {mesas.error && <OperacionRemoteState resource={mesas} />}
    {success && <p role="status">{success}</p>}
    <button className="drawer-secondary-button" disabled={orders.loading} onClick={orders.refresh}>Actualizar pedidos</button>
    <OperacionRemoteState resource={orders} empty="No hay pedidos para mostrar."><section className="pedidos-table-panel"><div className="pedidos-table-header"><h2>Pedidos registrados</h2><p>{orders.data?.paginacion.total} pedidos</p></div><div className="pedidos-table-wrapper"><table className="pedidos-table"><thead><tr><th>Pedido</th><th>Mesa</th><th>Cliente</th><th>Responsable del pedido</th><th>Estado</th><th>Creado</th><th></th></tr></thead><tbody>
      {rows.map(p => <tr className="pedido-row" key={p.id}><td className="operacion-id">{p.id}</td><td>Mesa {p.mesa_numero ?? p.mesas_id}</td><td>{p.cliente_nombre || p.clientes_id}</td><td>{p.responsable_nombre || p.usuarios_id}</td><td><span className={`pedido-status ${p.estado}`}>{estadosPedido[p.estado]}</span></td><td>{formatDateTime(p.creado_en)}</td><td><button className="pedido-detail-button" onClick={() => select(p.id)}>Ver detalle</button></td></tr>)}
      {!rows.length && <tr><td colSpan={7}>No hay coincidencias en esta página.</td></tr>}
    </tbody></table></div></section></OperacionRemoteState>
    <div className="operacion-pagination"><InventoryPagination resource={{ ...orders, query, setQuery }} /></div>
    {creating && <PedidoForm mesas={mesas} initialMesa={query.mesas_id || ''} onClose={() => setCreating(false)} onCreated={async id => { await Promise.all([orders.refresh(), mesas.refresh()]); setCreating(false); setSuccess('Pedido creado correctamente.'); select(id); }} />}
    {selectedId && !creating && <PedidoDetalle key={selectedId} id={selectedId} summary={orders.data?.datos.find(p => p.id === selectedId)} mesas={mesas} productos={productos} onClose={() => select(null)} onChanged={orders.refresh} />}
  </div>;
}
