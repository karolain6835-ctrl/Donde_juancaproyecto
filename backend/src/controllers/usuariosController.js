// 1. Registro de nuevo usuario/empleado (Simulado)
exports.registrarUsuario = async (req, res) => {
  const { nombre, correo, contrasena, roles_id } = req.body;

  if (!nombre || !correo || !contrasena || !roles_id) {
    return res.status(400).json({ 
      error: 'Todos los campos (nombre, correo, contrasena, roles_id) son obligatorios.' 
    });
  }

  res.status(201).json({
    mensaje: `¡Usuario ${nombre} registrado con éxito en el sistema! 🔑👤`,
    usuario: {
      correo,
      rol_asignado: roles_id === 1 ? "Administrador" : "Mesero/Staff",
      creado_en: new Date()
    }
  });
};

// 2. Inicio de Sesión / Login (Simulado)
exports.loginUsuario = async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'El correo y la contraseña son obligatorios.' });
  }

  // Simulación de validación de credenciales
  if (correo === "admin@dondejuanca.com" && contrasena === "123456") {
    return res.json({
      mensaje: "¡Inicio de sesión exitoso! Bienvenido al sistema de Donde Juanca. 🔓✨",
      token_simulado: "jwt-token-dondejuanca-2026-xyz123",
      usuario: {
        nombre: "Karol Julio",
        correo: correo,
        rol: "Administrador"
      }
    });
  } else {
    return res.status(401).json({ 
      error: 'Credenciales incorrectas. Intenta con admin@dondejuanca.com y contraseña 123456' 
    });
  }
};