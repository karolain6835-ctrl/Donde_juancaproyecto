import { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import Can from './Can';
import { formatDateTime } from '../utils/dateTime';
import { formatCurrency } from '../utils/formatCurrency';
import { registrarMerma } from '../services/mermasService';
import { stockMutation } from '../services/inventarioService';
import { useCatalogMutation } from '../hooks/useRemoteCatalog';
import InventoryRemoteState, { InventoryPagination } from './InventoryRemoteState';
import './CatalogoForm.css';
import './MermasSection.css';

export default function MermasSection({ resource, motivos, refrigeradores, productos = [], onStockChanged, productosLoading, productosError, onReloadProducts }) {
  const { user } = useAuth();
  const mutation = useCatalogMutation();
  const [busqueda, setBusqueda] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ productos_id: '', cantidad: '', merma_motivos_id: '', refrigeradores_id: '' });
  const [selected, setSelected] = useState(null);
  const rows = useMemo(() => (resource.data?.datos || []).filter(row => [row.producto_nombre, row.motivo_nombre, row.refrigerador_nombre, row.usuario_nombre].some(value => (value || '').toLowerCase().includes(busqueda.toLowerCase()))), [resource.data, busqueda]);
  const fridges = (refrigeradores.data || []).filter(row => row.estado === 'activa');
  const product = productos.find(p => p.id === form.productos_id);
  const ready = !motivos.loading && !motivos.error && !refrigeradores.loading && !refrigeradores.error && !productosLoading && !productosError;
  const update = event => setForm({ ...form, [event.target.name]: event.target.value });
  const save = event => {
    event.preventDefault();
    if (!can(user, 'mermas.registrar') || !ready || !product || !fridges.some(f => f.id === form.refrigeradores_id) || !(motivos.data || []).some(m => m.id === form.merma_motivos_id)) return;
    mutation.run(() => stockMutation(() => registrarMerma(form), onStockChanged), async () => { setShow(false); setForm({ productos_id: '', cantidad: '', merma_motivos_id: '', refrigeradores_id: '' }); }, 'Merma registrada correctamente.');
  };
  return <div className="mermas-section"><section className="mermas-toolbar"><div className="mermas-search"><Search size={17} /><input aria-label="Buscar mermas en esta página" placeholder="Buscar en esta página..." value={busqueda} onChange={event => setBusqueda(event.target.value)} /></div><Can permission="mermas.registrar"><button className="primary-button mermas-new-button" disabled={mutation.busy} onClick={() => { mutation.reset(); setShow(true); }}><Plus size={18} />Registrar merma</button></Can></section>
    {mutation.success && <p role="status">{mutation.success}</p>}{mutation.error && !show && <p role="alert">{mutation.error}</p>}
    <InventoryRemoteState resource={resource} empty="No hay mermas para mostrar."><section className="mermas-panel"><div className="mermas-table-wrapper"><table className="mermas-table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Motivo</th><th>Valor</th><th>Fecha</th><th>Usuario</th><th></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.producto_nombre || row.productos_id}</td><td>{row.cantidad}</td><td>{row.motivo_nombre || row.merma_motivos_id}</td><td>{formatCurrency(row.valor_economico)}</td><td>{formatDateTime(row.creado_en)}</td><td>{row.usuario_nombre || '—'}</td><td><button className="merma-detail-button" onClick={() => setSelected(row)}>Ver detalle</button></td></tr>)}{!rows.length && <tr><td colSpan={7}>No hay coincidencias en esta página.</td></tr>}</tbody></table></div></section></InventoryRemoteState><InventoryPagination resource={resource} />
    {selected && <><div className="merma-overlay" onClick={() => setSelected(null)} /><aside className="merma-drawer"><div className="merma-drawer-header"><h2>{selected.producto_nombre || selected.productos_id}</h2><button className="drawer-close" onClick={() => setSelected(null)} aria-label="Cerrar detalle">×</button></div><p>Motivo: {selected.motivo_nombre || selected.merma_motivos_id}</p><p>Cantidad: {selected.cantidad}</p><p>Valor: {formatCurrency(selected.valor_economico)}</p><p>Refrigerador: {selected.refrigerador_nombre || selected.refrigeradores_id}</p><p>Fecha: {formatDateTime(selected.creado_en)}</p><p>Usuario: {selected.usuario_nombre || '—'}</p><p>Movimiento: {selected.movimientos_inventario_id}</p></aside></>}
    {show && can(user, 'mermas.registrar') && <><div className="merma-overlay" onClick={() => { if (!mutation.busy) setShow(false); }} /><aside className="merma-drawer" role="dialog" aria-modal="true" aria-label="Registrar merma"><div className="merma-drawer-header"><h2>Registrar merma</h2><button className="drawer-close" disabled={mutation.busy} onClick={() => setShow(false)} aria-label="Cerrar formulario">×</button></div>
      {(motivos.loading || refrigeradores.loading || productosLoading) && <p role="status">Cargando opciones...</p>}
      {motivos.error && <div role="alert"><p>{motivos.error}</p><button onClick={motivos.refresh}>Reintentar motivos</button></div>}
      {refrigeradores.error && <div role="alert"><p>{refrigeradores.error}</p><button onClick={refrigeradores.refresh}>Reintentar refrigeradores</button></div>}
      {productosError && <div role="alert"><p>{productosError}</p><button onClick={onReloadProducts}>Reintentar productos</button></div>}
      {ready && (!fridges.length || !productos.length || !motivos.data?.length) && <p>No hay productos, motivos o refrigeradores activos suficientes para registrar una merma.</p>}
      <form className="catalogo-form" onSubmit={save}><fieldset disabled={mutation.busy || !ready}><label>Producto<select name="productos_id" value={form.productos_id} onChange={update} required><option value="">Selecciona un producto</option>{productos.map(p => <option key={p.id} value={p.id}>{p.codigo ?? "—"} — {p.nombre} — Stock: {p.stock ?? "—"}</option>)}</select></label>{product && <dl className="merma-product-selection" aria-live="polite">
        <div><dt>Código</dt><dd>{product.codigo ?? '—'}</dd></div>
        <div><dt>Producto</dt><dd>{product.nombre}</dd></div>
        <div><dt>Stock disponible</dt><dd>{product.stock ?? '—'}</dd></div>
      </dl>}<label>Motivo<select name="merma_motivos_id" value={form.merma_motivos_id} onChange={update} required><option value="">Selecciona un motivo</option>{(motivos.data || []).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label><label>Refrigerador<select name="refrigeradores_id" value={form.refrigeradores_id} onChange={update} required><option value="">Selecciona un refrigerador activo</option>{fridges.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></label><label>Cantidad<input name="cantidad" type="number" min="1" max={product?.stock ?? 2147483647} step="1" value={form.cantidad} onChange={update} required /></label>{mutation.error && <p role="alert">{mutation.error}</p>}<button className="drawer-primary-button" type="submit" disabled={mutation.busy || !fridges.length || !product || !(motivos.data || []).length}>{mutation.busy ? 'Guardando...' : 'Registrar merma'}</button></fieldset></form></aside></>}
  </div>;
}
