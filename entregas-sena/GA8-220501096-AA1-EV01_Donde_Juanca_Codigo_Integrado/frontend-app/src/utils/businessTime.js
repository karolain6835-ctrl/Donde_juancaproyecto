export const BUSINESS_TIME_ZONE = 'America/Bogota';
export const BUSINESS_OFFSET = '-05:00';
const parts = value => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
}).formatToParts(value).map(p => [p.type, p.value]));
export function businessDateTime(value = new Date()) {
  const p = parts(value);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}
export const businessDate = (value = new Date()) => businessDateTime(value).slice(0, 10);
// Operaciones sobre días de calendario, no sobre la zona local del navegador.
export function addCalendarDays(day, count) {
  return new Date(Date.parse(day + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10);
}
export function businessToUTC(value) {
  const normalized = value.length === 16 ? value + ':00' : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) throw new Error('Fecha inválida.');
  const date = new Date(normalized + BUSINESS_OFFSET);
  if (!Number.isFinite(date.getTime()) || businessDateTime(date) !== normalized) throw new Error('Fecha inválida.');
  return date;
}
export const businessDayStart = day => businessToUTC(day + 'T00:00:00');
