import { useCallback, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { formatDateTime } from '../utils/dateTime';
import { alertActions, detalleAlerta, actuarAlerta } from '../services/alertasInventarioService';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';
import InventoryRemoteState, { InventoryPagination } from './InventoryRemoteState';
import './AlertasSection.css';

const labels = { vista: 'Marcar como vista', silenciar: 'Silenciar', reactivar: 'Reactivar', resolver: 'Resolver' };
export default function AlertasSection({ resource, productos = [] }) {
  const { user } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const mutation = useCatalogMutation();
  const loader = useCallback(options => selectedId ? detalleAlerta(selectedId, options) : Promise.resolve(null), [selectedId]);
  const detail = useRemoteCatalog(loader);
  const rows = useMemo(() => (resource.data?.datos || []).filter(row => (row.producto || row.productos_id).toLowerCase().includes(busqueda.toLowerCase())), [resource.data, busqueda]);
  const filter = (key, value) => resource.setQuery({ ...resource.query, [key]: value || undefined, pagina: 1 });
  const alerta = detail.data?.id === selectedId ? detail.data : null;
  const act = action => {
    if (!alerta || !can(user, `alertas.${action}`)) return;
    mutation.run(() => actuarAlerta(alerta.id, action), async () => { await Promise.all([resource.refresh(), detail.refresh()]); }, 'Estado de alerta actualizado correctamente.');
  };
  return <div className="alertas-section"><section className="alertas-toolbar"><div className="alertas-filters">{['','activa','vista','silenciada','resuelta'].map(estado => <button key={estado} className={(resource.query.estado || '') === estado ? 'filter-button active' : 'filter-button'} onClick={() => filter('estado', estado)}>{estado || 'Abiertas'}</button>)}</div><select aria-label="Filtrar alertas por producto" value={resource.query.producto_id || ''} onChange={event => filter('producto_id', event.target.value)}><option value="">Todos los productos</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select><select aria-label="Tipo de alerta" value={resource.query.tipo || ''} onChange={event => filter('tipo', event.target.value)}><option value="">Todos los tipos</option><option value="bajo">Stock bajo</option><option value="agotado">Agotado</option></select><div className="alertas-search"><Search className="alertas-search-icon" size={17} /><input aria-label="Buscar alertas en esta página" placeholder="Buscar en esta página..." value={busqueda} onChange={event => setBusqueda(event.target.value)} /></div></section>
    <InventoryRemoteState resource={resource} empty="No hay alertas para mostrar.">
      <section className="alertas-panel"><div className="alertas-list">
        {rows.map(row => <article className={`alerta-row ${row.tipo}`} key={row.id}>
          <header className="alerta-card-header">
            <h3>{row.producto || row.productos_id}</h3>
            <span className={`alerta-status ${row.estado}`}>{row.estado}</span>
          </header>
          <dl className="alerta-metrics">
            <div><dt>Stock observado</dt><dd>{row.stock_actual}</dd></div>
            <div><dt>Stock mínimo</dt><dd>{row.stock_minimo}</dd></div>
            <div><dt>Tipo</dt><dd>{row.tipo === 'agotado' ? 'Agotado' : 'Stock bajo'}</dd></div>
          </dl>
          <dl className="alerta-dates">
            <div><dt>Creada</dt><dd>{formatDateTime(row.creado_en)}</dd></div>
            <div><dt>Actualizada</dt><dd>{formatDateTime(row.actualizado_en)}</dd></div>
            <div><dt>Resuelta</dt><dd>{row.resuelto_en ? formatDateTime(row.resuelto_en) : '—'}</dd></div>
          </dl>
          <footer className="alerta-card-footer">
            <button className="alerta-detail-button" disabled={mutation.busy} onClick={() => { mutation.reset(); setSelectedId(row.id); }}>Ver detalle</button>
          </footer>
        </article>)}
        {!rows.length && <p>No hay coincidencias en esta página.</p>}
      </div></section>
    </InventoryRemoteState>
    <div className="alertas-pagination"><InventoryPagination resource={resource} /></div>
    {selectedId && <><div className="alerta-overlay" onClick={() => { if (!mutation.busy) setSelectedId(null); }} /><aside className="alerta-drawer"><div className="alerta-drawer-header"><h2>Detalle de alerta</h2><button className="drawer-close" disabled={mutation.busy} onClick={() => setSelectedId(null)} aria-label="Cerrar detalle">×</button></div>
      {detail.error ? <div role="alert"><p>{detail.error}</p><button onClick={detail.refresh}>Reintentar detalle</button></div> : detail.loading || !alerta ? <p role="status">Cargando alerta...</p> : <><h3>{alerta.producto || alerta.productos_id}</h3><p>Tipo: {alerta.tipo}</p><p>Estado: {alerta.estado}</p><p>Stock observado: {alerta.stock_actual}</p><p>Stock mínimo: {alerta.stock_minimo}</p><p>Creada: {formatDateTime(alerta.creado_en)}</p><p>Actualizada: {formatDateTime(alerta.actualizado_en)}</p>{alerta.resuelto_en && <p>Resuelta: {formatDateTime(alerta.resuelto_en)}</p>}<div className="alerta-actions">{alertActions[alerta.estado].filter(action => can(user, `alertas.${action}`)).map(action => <button key={action} className="drawer-secondary-button" disabled={mutation.busy} onClick={() => act(action)}>{mutation.busy ? 'Procesando...' : labels[action]}</button>)}</div><h3>Historial</h3>{alerta.historial.length ? alerta.historial.map(item => <article key={item.id}><p>{item.evento}</p><p>{formatDateTime(item.creado_en)} · {item.origen}</p></article>) : <p>No hay eventos para mostrar.</p>}</>}
      {mutation.error && <p role="alert">{mutation.error}</p>}{mutation.success && <p role="status">{mutation.success}</p>}
    </aside></>}
  </div>;
}
