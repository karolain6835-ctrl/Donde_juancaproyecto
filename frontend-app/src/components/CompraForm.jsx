import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { crearCompra } from '../services/comprasService';
import { useCatalogMutation } from '../hooks/useRemoteCatalog';
import './CatalogoForm.css';

const emptyItem = () => ({ productos_id: '', cantidad: '', costo: '' });
export default function CompraForm({ proveedores, productos, onClose, onCreated }) {
  const { user } = useAuth();
  const mutation = useCatalogMutation();
  const [form, setForm] = useState({ proveedores_id: '', items: [emptyItem()] });
  const [validation, setValidation] = useState('');
  const ready = !proveedores.loading && !proveedores.error && !productos.loading && !productos.error;
  const activeProviders = (proveedores.data || []).filter(p => p.estado === 'activo');
  const updateItem = (index, key, value) => setForm(old => ({ ...old, items: old.items.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  function save(event) {
    event.preventDefault(); setValidation('');
    if (!can(user, 'compras.crear') || !ready) return;
    if (!activeProviders.some(p => p.id === form.proveedores_id) || form.items.some(item => !productos.data?.some(p => p.id === item.productos_id))) {
      setValidation('Selecciona un proveedor activo y productos reales.'); return;
    }
    mutation.run(() => crearCompra(form), async () => { await onCreated(); onClose(); }, 'Compra creada correctamente.');
  }
  return <>
    <div className="compra-overlay" onClick={() => { if (!mutation.busy) onClose(); }} />
    <aside className="compra-drawer" role="dialog" aria-modal="true" aria-label="Nueva compra">
      <div className="compra-drawer-header"><h2>Nueva compra</h2><button className="drawer-close" disabled={mutation.busy} onClick={onClose} aria-label="Cerrar formulario">×</button></div>
      {[['proveedores', proveedores], ['productos', productos]].map(([name, resource]) => <div key={name}>
        {resource.loading && <p role="status">Cargando {name}...</p>}
        {resource.error && <div role="alert"><p>{resource.error}</p><button onClick={resource.refresh}>Reintentar {name}</button></div>}
      </div>)}
      {ready && (!activeProviders.length || !productos.data?.length) && <p>No hay proveedores activos o productos disponibles para crear la compra.</p>}
      <form className="catalogo-form compra-form" onSubmit={save}><fieldset disabled={mutation.busy || !ready}>
        <label>Proveedor<select value={form.proveedores_id} onChange={event => setForm({ ...form, proveedores_id: event.target.value })} required><option value="">Selecciona un proveedor activo</option>{activeProviders.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
        {form.items.map((item, index) => <section className="compra-form-item" key={index} aria-label={`Producto ${index + 1}`}>
          <label>Producto<select value={item.productos_id} onChange={event => updateItem(index, 'productos_id', event.target.value)} required><option value="">Selecciona un producto</option>{(productos.data || []).map(p => <option key={p.id} value={p.id} disabled={form.items.some((other, i) => i !== index && other.productos_id === p.id)}>{p.codigo} — {p.nombre} — Stock: {p.stock}</option>)}</select></label>
          <label>Cantidad<input type="number" min="1" max="2147483647" step="1" value={item.cantidad} onChange={event => updateItem(index, 'cantidad', event.target.value)} required /></label>
          <label>Costo unitario<input type="text" inputMode="decimal" placeholder="2.844,44" value={item.costo} onChange={event => updateItem(index, 'costo', event.target.value)} required /></label>
          <small>Usa puntos para miles y coma para centavos.</small>
          {form.items.length > 1 && <button type="button" className="drawer-secondary-button" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>Quitar producto</button>}
        </section>)}
        <button type="button" className="drawer-secondary-button" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>Agregar producto</button>
        {(validation || mutation.error) && <p role="alert">{validation || mutation.error}</p>}
        <button className="drawer-primary-button" type="submit" disabled={!activeProviders.length || !productos.data?.length}>{mutation.busy ? 'Guardando...' : 'Crear compra'}</button>
      </fieldset></form>
    </aside>
  </>;
}
