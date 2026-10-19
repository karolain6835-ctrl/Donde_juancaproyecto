import { formatCurrency } from '../utils/formatCurrency';
import { resumirProductosCuenta } from '../utils/resumenCuenta';

export default function MesaCuentaResumen({ cuenta }) {
  const productos = resumirProductosCuenta(cuenta.detalle_productos);
  return <>
    <h3>Resumen de consumo</h3>
    {productos.map(item => <article className="operacion-item mesa-consumo-resumen" key={item.producto_id}>
      <strong>{item.nombre}</strong>
      <dl className="operacion-info"><div><dt>Cantidad total</dt><dd>{item.cantidad_total}</dd></div><div><dt>Subtotal</dt><dd>{formatCurrency(item.subtotal_total)}</dd></div></dl>
      {item.precio_unitario === null && <small>Precios diferentes</small>}
    </article>)}
    {!productos.length && <p>No hay productos pendientes en la cuenta.</p>}
    <dl className="operacion-info"><div><dt>Total productos</dt><dd>{formatCurrency(cuenta.resumen.subtotal_productos)}</dd></div></dl>
    {Boolean(cuenta.detalle_juegos?.length) && <section className="mesa-cuenta-juegos"><h3>Juegos</h3>
      {cuenta.detalle_juegos.map(juego => <article className="operacion-item" key={juego.id}><strong>Juego</strong><small className="operacion-id">{juego.id}</small><p>{juego.costo_tiempo === null ? 'Importe pendiente' : formatCurrency(juego.costo_tiempo)}</p></article>)}
      <dl className="operacion-info"><div><dt>Total juegos</dt><dd>{formatCurrency(cuenta.resumen.subtotal_juegos)}</dd></div></dl>
    </section>}
    <dl className="operacion-info mesa-cuenta-total"><div><dt>Total cuenta</dt><dd>{formatCurrency(cuenta.resumen.total_general)}</dd></div></dl>
    {Boolean(cuenta.detalle_productos.length) && <details className="mesa-cuenta-detalle"><summary>Detalle de consumos</summary>
      {cuenta.detalle_productos.map((item, index) => <div className="operacion-item" key={`${item.producto_id}-${index}`}><strong>{item.nombre}</strong><p>{item.cantidad_pedida} × {formatCurrency(item.precio_unitario)}</p><p>Subtotal: {formatCurrency(item.subtotal)}</p></div>)}
    </details>}
  </>;
}
