// 1. Registrar un nuevo cliente (Simulado)
exports.registrarCliente = async (req, res) => {
  const { id, nombre, telefono, puntos } = req.body;

  if (!id || !nombre) {
    return res.status(400).json({ error: 'El id (cédula/código) y el nombre del cliente son obligatorios.' });
  }

  res.status(201).json({
    mensaje: `¡Cliente ${nombre} registrado con éxito! 👤✨`,
    cliente: { id, nombre, telefono, puntos: puntos || 0 }
  });
};

// 2. Obtener la información de un cliente por su ID (Simulado)
exports.obtenerCliente = async (req, res) => {
  const { id } = req.params;

  // Simulamos que encontramos al cliente en la base de datos
  res.json({
    mensaje: "Cliente encontrado.",
    cliente: {
      id: id,
      nombre: "Carlos Mendoza",
      telefono: "3157778899",
      puntos: 150,
      tipo_cliente: "Frecuente 🎯"
    }
  });
};