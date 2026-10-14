import { useCallback, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/dateTime';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';
import InventoryRemoteState, { InventoryPagination } from './InventoryRemoteState';
import { detalleCompra, listarRecepciones, estadosCompra, pendienteItem, recepcionBody, recibirCompra, cancelarPendiente, reversarRecepcion, sincronizarCompra } from '../services/comprasService';
import './CatalogoForm.css';

export default function CompraDetalle({ id, proveedores, productos, intentos, onClose, onChanged }) {
  const { user } = useAuth();
  const loader = useCallback(options => detalleCompra(id, options), [id]);
  const detail = useRemoteCatalog(loader);
  const [pagina, setPagina] = useState(1);
  const receptionLoader = useCallback(options => listarRecepciones(id, { pagina }, options), [id, pagina]);
  const receptions = useRemoteCatalog(receptionLoader);
  const mutation = useCatalogMutation();
  const [cantidades, setCantidades] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [validation, setValidation] = useState('');
  const compra = detail.data;
  const open = compra && ['pendiente', 'parcialmente_recibida'].includes(compra.estado);
  const productName = item => item.producto_nombre || productos.data?.find(p => p.id === item.productos_id)?.nombre || item.productos_id;
  const refresh = () => Promise.all([detail.refresh(), receptions.refresh(), onChanged()]);
  function receive(total) {
    if (!can(user, 'compras.recibir') || !open) return;
    setValidation('');
    let body;
    try { body = recepcionBody(compra, total ? undefined : cantidades); }
    catch (error) { setValidation(error.message); return; }
    const key = intentos.key(id, body);
    mutation.run(() => sincronizarCompra(() => recibirCompra(id, body, key), [refresh]), async () => {
      intentos.clear(); setCantidades({});
    }, 'Recepción registrada correctamente.');
  }
  function confirm(event) {
    event.preventDefault();
    if (!confirmation || !can(user, confirmation.type === 'cancelar' ? 'compras.cancelar' : 'compras.reversar')) return;
    const operation = confirmation.type === 'cancelar' ? () => cancelarPendiente(id, motivo) : () => reversarRecepcion(id, confirmation.recepcionId, motivo);
    mutation.run(() => sincronizarCompra(operation, [refresh]), async () => {
      setConfirmation(null); setMotivo(''); intentos.clear();
    }, confirmation.type === 'cancelar' ? 'Saldo pendiente cancelado correctamente.' : 'Recepción reversada correctamente.');
  }
  function ask(value) { mutation.reset(); setValidation(''); setMotivo(''); setConfirmation(value); }
  return <>
    <div className="compra-overlay" onClick={() => { if (!mutation.busy) onClose(); }} />
    <aside className="compra-drawer" role="dialog" aria-modal="true" aria-label="Detalle de compra">
      <div className="compra-drawer-header"><h2>Detalle de compra</h2><button className="drawer-close" disabled={mutation.busy} onClick={onClose} aria-label="Cerrar detalle">×</button></div>
      {detail.loading ? <p role="status">Cargando compra...</p> : detail.error ? <div role="alert"><p>{detail.error}</p><button onClick={detail.refresh}>Reintentar detalle</button></div> : compra && <>
        <p className="compra-real-id">{compra.id}</p>
        <div className={`compra-drawer-status ${compra.estado}`}><span>Estado</span><strong>{estadosCompra[compra.estado]}</strong></div>
        <div className="compra-detail-grid">
          <div><span>Proveedor</span><strong>{proveedores.data?.find(p => p.id === compra.proveedores_id)?.nombre || compra.proveedores_id}</strong></div>
          <div><span>Creada</span><strong>{formatDateTime(compra.creado_en)}</strong></div>
          <div><span>Creador (ID)</span><strong>{compra.usuarios_id}</strong></div>
          <div><span>Total compra</span><strong>{formatCurrency(compra.total_estimado)}</strong></div>
          <div><span>Total recibido</span><strong>{formatCurrency(compra.total_recibido)}</strong></div>
        </div>
        <section className="compra-products"><h3>Productos de la orden</h3>
          {compra.items.map(item => <div className="compra-form-item" key={item.id}>
            <strong>{productName(item)}</strong>
            <p>Cantidad: {item.cantidad} · Costo unitario: {formatCurrency(item.precio_unitario)}</p>
            <p>Recibida: {item.cantidad_recibida ?? '—'} · Cancelada: {item.cantidad_cancelada ?? '—'} · Pendiente: {item.cantidad_pendiente ?? '—'}</p>
            {open && can(user, 'compras.recibir') && pendienteItem(item) > 0 && <label className="compra-quantity">Cantidad a recibir<input aria-label={`Cantidad a recibir de ${productName(item)}`} type="number" min="0" max={pendienteItem(item)} step="1" disabled={mutation.busy} value={cantidades[item.id] ?? ''} onChange={event => setCantidades({ ...cantidades, [item.id]: event.target.value })} /></label>}
            {productos.data?.find(p => p.id === item.productos_id) && <p>Stock disponible: {productos.data.find(p => p.id === item.productos_id).stock} · Costo promedio: {formatCurrency(productos.data.find(p => p.id === item.productos_id).costo)}</p>}
          </div>)}
        </section>
        {productos.loading && <p role="status">Actualizando stock y costo promedio...</p>}
        {productos.error && <div role="alert"><p>{productos.error}</p><button onClick={productos.refresh}>Reintentar productos</button></div>}
        {open && !confirmation && <div className="compra-actions">
          {can(user, 'compras.recibir') && <><button className="drawer-primary-button" disabled={mutation.busy} onClick={() => receive(true)}>Recibir todo lo pendiente</button><button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => receive(false)}>Recibir cantidades indicadas</button></>}
          {can(user, 'compras.cancelar') && <button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => ask({ type: 'cancelar' })}>Cancelar saldo pendiente</button>}
        </div>}
        <section className="compra-receptions"><h3>Recepciones</h3>
          <InventoryRemoteState resource={receptions} empty="No hay recepciones para mostrar.">
            {receptions.data?.datos.map(r => <article className="compra-form-item" key={r.id}>
              <strong>{formatDateTime(r.recibida_en)}</strong><p>Estado: {r.estado}</p><p>Receptor (ID): {r.recibida_por}</p><p>Reversada: {r.estado === 'reversada' ? 'Sí' : 'No'}</p>
              {r.items.map(item => <p key={item.id}>{productName(item)} · Cantidad recibida: {item.cantidad_recibida}</p>)}
              {r.motivo_reverso && <><p>Motivo del reverso: {r.motivo_reverso}</p><p>Reversada: {formatDateTime(r.reversada_en)}</p></>}
              {compra.modelo_recepcion === 'v2' && r.estado === 'confirmada' && can(user, 'compras.reversar') && !confirmation && <button className="drawer-secondary-button" disabled={mutation.busy} onClick={() => ask({ type: 'reversar', recepcionId: r.id })}>Reversar recepción</button>}
            </article>)}
          </InventoryRemoteState>
          <InventoryPagination resource={{ ...receptions, query: { pagina }, setQuery: q => setPagina(q.pagina) }} />
        </section>
      </>}
      {confirmation && <form className="catalogo-form compra-form" onSubmit={confirm}><fieldset disabled={mutation.busy}>
        <h3>{confirmation.type === 'cancelar' ? 'Confirmar cancelación del saldo pendiente' : 'Confirmar reverso de recepción'}</h3>
        <p>{confirmation.type === 'cancelar' ? 'Se cancelarán únicamente las cantidades que aún no se han recibido.' : 'El reverso puede ser rechazado si hubo operaciones posteriores sobre estos productos.'}</p>
        <label>Motivo<input value={motivo} onChange={event => setMotivo(event.target.value)} maxLength={500} required /></label>
        <button type="submit" className="drawer-primary-button">{mutation.busy ? 'Procesando...' : 'Confirmar'}</button><button type="button" className="drawer-secondary-button" onClick={() => { setConfirmation(null); mutation.reset(); }}>Volver</button>
      </fieldset></form>}
      {(validation || mutation.error) && <p role="alert">{validation || mutation.error}</p>}{mutation.success && <p role="status">{mutation.success}</p>}
    </aside>
  </>;
}
