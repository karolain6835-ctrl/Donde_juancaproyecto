// Entrada colombiana: punto para miles y coma para uno o dos decimales.
// Rechazar formatos ambiguos; nunca interpretar "3.500" como 3.5.
export function parseCOPInput(value) {
  if (typeof value !== 'string') throw new Error('Escribe el precio en formato colombiano.');
  const text = value.trim();
  if (!/^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) {
    throw new Error('Precio inválido. Usa puntos para miles y coma para decimales, por ejemplo 3.500 o 2.844,44.');
  }
  const number = Number(text.replaceAll('.', '').replace(',', '.'));
  if (!Number.isFinite(number) || number > Number.MAX_SAFE_INTEGER) throw new Error('El precio está fuera del rango permitido.');
  return number;
}

// Los números recibidos de la API ya están normalizados: no volver a analizar sus puntos.
export function formatCOPInput(value) {
  return typeof value === 'number' && Number.isFinite(value) ? String(value).replace('.', ',') : '';
}
