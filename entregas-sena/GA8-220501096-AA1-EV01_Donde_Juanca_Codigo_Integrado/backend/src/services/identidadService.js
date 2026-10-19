// El middleware JWT ya resolvi? la identidad actual de MySQL.
const ejecutor = (req, res, camposActor = ['usuarios_id']) => {
  if (!req.usuario || typeof req.usuario.id !== 'string' || !req.usuario.id) {
    res.status(401).json({ error: 'Autenticación requerida.' });
    return null;
  }
  if (camposActor.some(campo => Object.prototype.hasOwnProperty.call(req.body || {}, campo))) {
    res.status(400).json({ error: 'El actor se obtiene de la sesión; no lo envíes en el body.' });
    return null;
  }
  return req.usuario.id;
};
module.exports = { ejecutor };
