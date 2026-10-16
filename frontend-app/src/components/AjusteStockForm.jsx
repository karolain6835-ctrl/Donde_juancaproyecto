import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { ajustarStock, stockMutation } from '../services/inventarioService';
import { useCatalogMutation } from '../hooks/useRemoteCatalog';
import './CatalogoForm.css';

/** Gestiona el producto y la nueva cantidad; delega el ajuste al servicio de inventario. */
export default function AjusteStockForm({ productos, initialId, onRefresh, onSaved, onClose }) {
  const { user } = useAuth();
  const [productoId, setProductoId] = useState(initialId || '');
  const selected = productos.find(p => p.id === productoId);
  const [cantidad, setCantidad] = useState(() => String(productos.find(p => p.id === initialId)?.stock ?? ''));
  const mutation = useCatalogMutation();
  const validNumber = cantidad.trim() !== '' && Number.isInteger(Number(cantidad)) && Number(cantidad) >= 0;
/** Evita cerrar el panel mientras se guarda el ajuste. */
  const close = () => { if (!mutation.busy) onClose(); };
/** Comprueba el permiso, guarda y recarga los datos antes de notificar al padre. */
  const save = event => {
    event.preventDefault();
    if (!can(user, 'inventario.ajustar') || !selected) return;
    mutation.run(async () => {
      const response = await stockMutation(() => ajustarStock({ producto_id: productoId, nueva_cantidad: cantidad }), onRefresh);
      onSaved(response);
    }, async () => {}, 'Stock actualizado.');
  };
  return <><div className="inventario-overlay" onClick={close} /><aside className="inventario-drawer" role="dialog" aria-modal="true" aria-label="Ajustar stock"><div className="inventario-drawer-header"><h2>Ajustar stock</h2><button className="drawer-close" disabled={mutation.busy} onClick={close} aria-label="Cerrar ajuste">×</button></div><form className="catalogo-form" onSubmit={save}><fieldset disabled={mutation.busy}><label>Producto<select required value={productoId} onChange={event => { setProductoId(event.target.value); setCantidad(String(productos.find(p => p.id === event.target.value)?.stock ?? '')); }}><option value="">Selecciona un producto</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label><p>Stock actual: {selected?.stock ?? '—'}</p><label>Nueva cantidad<input type="number" min="0" max="2147483647" step="1" required value={cantidad} onChange={event => setCantidad(event.target.value)} /></label><p>Diferencia: {selected && validNumber ? Number(cantidad) - selected.stock : '—'}</p>{mutation.error && <p role="alert">{mutation.error}</p>}<button type="submit" className="drawer-primary-button" disabled={mutation.busy || !selected}>{mutation.busy ? 'Guardando...' : 'Confirmar ajuste'}</button></fieldset></form></aside></>;
}
