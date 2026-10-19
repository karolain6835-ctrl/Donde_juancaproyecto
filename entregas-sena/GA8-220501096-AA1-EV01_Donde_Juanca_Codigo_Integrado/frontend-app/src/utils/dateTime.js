import {BUSINESS_TIME_ZONE,businessDayStart} from './businessTime.js';
function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== 'string') return null;
  // No interpretar dd/mm/yyyy ni horas aisladas: son ambiguas, no timestamps UTC.
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const calendar = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() !== Number(month) - 1 ||
      calendar.getUTCDate() !== Number(day) || Number(hour || 0) > 23 || Number(minute || 0) > 59 || Number(second || 0) > 59) return null;
  // Una fecha sin hora conserva su día de calendario en Bogotá.
  if (!hour) return businessDayStart(value);
  const iso = value.replace(' ', 'T');
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function format(value, options) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat('es-CO', {...options,timeZone:BUSINESS_TIME_ZONE}).format(date) : '—';
}

export const formatDate = (value, options = { dateStyle: 'short' }) => format(value, options);
export const formatDateTime = value => format(value, { dateStyle: 'short', timeStyle: 'short' });
export const formatTime = value => format(value, { timeStyle: 'short' });
