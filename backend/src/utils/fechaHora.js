// DATETIME no contiene zona. Preservar la convención histórica de cada columna.
// Pedidos/pagos.creado_en y defaults de divisiones: Bogotá. Eventos UTC: UTC.
const ZONA_NEGOCIO = 'America/Bogota';
const OFFSET_NEGOCIO = '-05:00'; // Colombia no aplica horario de verano.
const horaBogotaSQL = `CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','${OFFSET_NEGOCIO}')`;
function fechaLocalSQL(columna) {
  // Solo nombres de columna constantes definidos por el código, nunca datos HTTP.
  if (!/^[a-z_][a-z0-9_.]*$/i.test(columna)) throw new Error('Columna de fecha inválida.');
  return `DATE_FORMAT(CONVERT_TZ(${columna},'${OFFSET_NEGOCIO}','+00:00'),'%Y-%m-%dT%H:%i:%sZ')`;
}
function fechaBogota(ahora = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_NEGOCIO, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(ahora).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
module.exports = { ZONA_NEGOCIO, OFFSET_NEGOCIO, horaBogotaSQL, fechaLocalSQL, fechaBogota };
