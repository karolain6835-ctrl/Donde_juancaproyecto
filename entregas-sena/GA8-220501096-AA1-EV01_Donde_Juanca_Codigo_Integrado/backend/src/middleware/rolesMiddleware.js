// La identidad y el rol actual deben haber sido resueltos por autenticar.
function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Autenticación requerida o sesión no válida.' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes autorización para esta operación.' });
    }
    return next();
  };
}

module.exports = { autorizarRoles };
