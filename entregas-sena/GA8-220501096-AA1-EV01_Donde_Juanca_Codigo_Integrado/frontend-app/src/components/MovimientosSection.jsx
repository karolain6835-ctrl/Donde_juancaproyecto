import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { formatDateTime } from '../utils/dateTime';
import InventoryRemoteState, { InventoryPagination } from './InventoryRemoteState';
import './MovimientosSection.css';

/** Presenta movimientos paginados y su detalle desde el recurso remoto recibido. */
export default function MovimientosSection({ resource, productos = [] }) {
  const [busqueda, setBusqueda] = useState('');
  const [selected, setSelected] = useState(null);
/** La búsqueda local se aplica solo a los movimientos de la página cargada. */
  const rows = useMemo(() => (resource.data?.datos || []).filter(row => [row.producto_nombre, row.producto_codigo, row.usuario_nombre, row.referencia_id, row.referencia_tipo].some(value => (value || '').toLowerCase().includes(busqueda.toLowerCase()))), [resource.data, busqueda]);
/** Los filtros remotos reinician la consulta desde la primera página. */
  const filter = (key, value) => resource.setQuery({ ...resource.query, [key]: value || undefined, pagina: 1 });
  return <div className="movimientos-section">
    <section className="movimientos-toolbar"><div className="movimientos-filters">{['','compra','venta','merma','ajuste'].map(tipo => <button key={tipo} className={(resource.query.tipo || '') === tipo ? 'filter-button active' : 'filter-button'} onClick={() => filter('tipo', tipo)}>{tipo || 'Todos'}</button>)}</div><select aria-label="Filtrar movimientos por producto" value={resource.query.producto_id || ''} onChange={event => filter('producto_id', event.target.value)}><option value="">Todos los productos</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select><div className="movimientos-search"><Search size={17} /><input aria-label="Buscar movimientos en esta página" placeholder="Buscar en esta página..." value={busqueda} onChange={event => setBusqueda(event.target.value)} /></div></section>
    <InventoryRemoteState resource={resource} empty="No hay movimientos para mostrar."><section className="movimientos-panel"><div className="movimientos-table-wrapper"><table className="movimientos-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Fecha</th><th>Usuario</th><th>Origen</th><th></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.producto_nombre || row.productos_id}</td><td>{row.tipo}</td><td>{row.cantidad}</td><td>{formatDateTime(row.creado_en)}</td><td>{row.usuario_nombre || '—'}</td><td>{row.referencia_tipo || '—'} {row.referencia_id || ''}</td><td><button className="movimiento-detail-button" onClick={() => setSelected(row)}>Ver detalle</button></td></tr>)}{!rows.length && <tr><td colSpan={7}>No hay coincidencias en esta página.</td></tr>}</tbody></table></div></section></InventoryRemoteState>
    <InventoryPagination resource={resource} />
    {selected && <><div className="movimiento-overlay" onClick={() => setSelected(null)} /><aside className="movimiento-drawer"><div className="movimiento-drawer-header"><h2>{selected.producto_nombre || selected.productos_id}</h2><button className="drawer-close" aria-label="Cerrar detalle" onClick={() => setSelected(null)}><X size={20} /></button></div><p>Tipo: {selected.tipo}</p><p>Cantidad: {selected.cantidad}</p><p>Stock anterior: {selected.stock_antes}</p><p>Stock posterior: {selected.stock_despues}</p><p>Fecha: {formatDateTime(selected.creado_en)}</p><p>Usuario: {selected.usuario_nombre || '—'}</p><p>Referencia: {selected.referencia_tipo || '—'} {selected.referencia_id || ''}</p></aside></>}
  </div>;
}
