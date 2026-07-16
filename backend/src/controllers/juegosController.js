// 1. Iniciar una sesión de juego (Simulado para pruebas rápidas)
exports.iniciarJuego = async (req, res) => {
  const { id, tipo_juego, activos_juego_id, mesas_id, iniciada_por } = req.body;

  if (!id || !tipo_juego || !activos_juego_id || !mesas_id || !iniciada_por) {
    return res.status(400).json({ 
      error: 'Los campos id, tipo_juego, activos_juego_id, mesas_id e iniciada_por son obligatorios.' 
    });
  }

  // Simulamos el éxito sin tocar la base de datos para saltar restricciones
  res.status(201).json({
    mensaje: `¡Sesión de ${tipo_juego} iniciada con éxito! (Modo de prueba activo) 🎯🎱`,
    id_sesion: id
  });
};

// 2. Terminar una sesión de juego (Simulado para pruebas rápidas)
exports.terminarJuego = async (req, res) => {
  const { id } = req.params;
  const { costo_total, cerrada_por } = req.body;

  if (costo_total === undefined || !cerrada_por) {
    return res.status(400).json({ error: 'Debes proporcionar el costo_total y el usuario que cierra (cerrada_por).' });
  }

  res.json({
    mensaje: '¡Sesión de juego finalizada con éxito! Cuenta registrada. (Modo de prueba activo)',
    id_sesion: id,
    total_cobrado: costo_total
  });
};