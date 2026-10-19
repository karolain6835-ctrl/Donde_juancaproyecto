// Aritmética exacta en centavos; un solo redondeo, mitad hacia arriba.
exports.calcularCosto = (tarifa, segundos) => {
  const error = mensaje => Object.assign(new Error(mensaje), { status: 409 });
  if (typeof tarifa !== 'string' || !/^\d{1,8}\.\d{2}$/.test(tarifa)) throw error('Tarifa inválida; requiere conciliación.');
  if (!Number.isSafeInteger(segundos) || segundos < 0) throw error('Duración inválida o negativa.');
  const [entero, fraccion] = tarifa.split('.');
  const total = ((BigInt(entero) * 100n + BigInt(fraccion)) * BigInt(segundos) + 1800n) / 3600n;
  if (total > 9999999999n) throw error('El costo excede DECIMAL(10,2).');
  return `${total / 100n}.${String(total % 100n).padStart(2, '0')}`;
};
