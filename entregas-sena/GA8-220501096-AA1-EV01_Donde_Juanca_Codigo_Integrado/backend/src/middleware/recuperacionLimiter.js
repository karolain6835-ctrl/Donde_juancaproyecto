const {createHash} = require('node:crypto');
const key = value => createHash('sha256').update(String(value)).digest('hex');

// Protección acotada por proceso. No guardar correos/IP legibles ni usar headers de proxy sin confianza.
function crearLimiter({ahora = Date.now, maxEntradas = 10000} = {}) {
  const buckets = new Map();
  function consumir(id, max, ventana) {
    const now = ahora();
    for (const [k, b] of buckets) if (b.fin <= now) buckets.delete(k);
    let b = buckets.get(id);
    if (!b) {
      if (buckets.size >= maxEntradas) return false;
      b = {n: 0, fin: now + ventana}; buckets.set(id, b);
    }
    b.n++;
    return b.n <= max;
  }
  return accion => (req, res, next) => {
    const email = typeof req.body?.correo === 'string' ? req.body.correo.trim().toLowerCase().slice(0, 150) : '';
    const cuenta = accion === 'restablecer' ? (typeof req.body?.token_recuperacion === 'string' ? req.body.token_recuperacion.slice(0,64) : '') : email;
    const ipOk = consumir(accion + ':ip:' + key(req.ip || req.socket?.remoteAddress || ''), accion === 'verificar' ? 30 : 10, 15 * 60000);
    const cuentaOk = consumir(accion + ':cuenta:' + key(cuenta || ''), accion === 'solicitar' ? 3 : accion === 'verificar' ? 5 : 8, 10 * 60000);
    if (!ipOk || !cuentaOk) {
      res.set('Retry-After', '900');
      return res.status(429).json({error: 'Demasiados intentos. Espera unos minutos antes de volver a intentar.'});
    }
    next();
  };
}
module.exports = {crearLimiter};
