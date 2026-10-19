const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = async (req, res, next) => {
  const noAutorizado = () => res.status(401).json({ error: 'Autenticación requerida o sesión no válida.' });
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string') return noAutorizado();
  const bearer = /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!bearer) return noAutorizado();
  const secreto = process.env.JWT_SECRET;
  if (!secreto || Buffer.byteLength(secreto, 'utf8') < 32) {
    return res.status(500).json({ error: 'No se pudo resolver la identidad.' });
  }
  let payload;
  try {
    payload = jwt.verify(bearer[1], secreto, { algorithms: ['HS256'], issuer: 'dondejuanca' });
    if (!payload || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 36 ||
        !Number.isSafeInteger(payload.exp)) return noAutorizado();
  } catch {
    return noAutorizado();
  }
  try {
    const [[usuario]] = await db.promise().query(`
      SELECT u.id,u.nombre,u.email,u.estado,u.roles_id,r.nombre AS rol
      FROM usuarios u JOIN roles r ON r.id=u.roles_id
      WHERE u.id=? LIMIT 1
    `, [payload.sub]);
    if (!usuario || usuario.estado !== 'activo') return noAutorizado();
    req.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email,
      roles_id: usuario.roles_id, rol: usuario.rol };
  } catch {
    return res.status(500).json({ error: 'No se pudo resolver la identidad.' });
  }
  return next();
};
