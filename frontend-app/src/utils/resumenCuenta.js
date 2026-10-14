// Proyección de lectura: sumar subtotales ya calculados por el backend.
// No recalcular con un precio vigente ni mutar las líneas originales.
function centavos(value) {
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Importe inválido en el detalle de la cuenta.');
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
const decimal = value => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
export function resumirProductosCuenta(items) {
  const groups = new Map();
  for (const item of items) {
    if (item.estado === 'cancelado') continue;
    const id = item.producto_id;
    const subtotal = centavos(item.subtotal), price = centavos(item.precio_unitario);
    const group = groups.get(id) || { producto_id: id, nombre: item.nombre, cantidad_total: 0, subtotal: 0n, precios: new Set() };
    group.cantidad_total += Number(item.cantidad_pedida);
    group.subtotal += subtotal;
    group.precios.add(price.toString());
    groups.set(id, group);
  }
  return [...groups.values()].map(group => ({
    producto_id: group.producto_id, nombre: group.nombre, cantidad_total: group.cantidad_total,
    subtotal_total: decimal(group.subtotal),
    precio_unitario: group.precios.size === 1 ? decimal(BigInt([...group.precios][0])) : null,
  }));
}
