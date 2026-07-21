const db = require('../config/db');

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
// 3. Generar y registrar código OTP (Restablecimiento de contraseña)
exports.solicitarOTP = (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      ok: false, 
      msg: 'El correo electrónico es obligatorio.' 
    });
  }

  // Buscar usuario por su email real en la BD
  const sqlBuscarUsuario = 'SELECT id FROM usuarios WHERE email = ?';

  db.query(sqlBuscarUsuario, [email], (err, resultados) => {
    if (err) {
      console.error('Error al buscar usuario:', err);
      return res.status(500).json({ ok: false, msg: 'Error en el servidor al consultar usuario.' });
    }

    if (resultados.length === 0) {
      return res.status(404).json({
        ok: false,
        msg: 'No existe un usuario asociado a este correo electrónico.'
      });
    }

    const usuarioId = resultados[0].id;
    const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const creadoEn = new Date();
    const expiraEn = new Date(Date.now() + 15 * 60 * 1000);

    const sqlInsertarOTP = `
      INSERT INTO otp_tokens (codigo, expira_en, usado, creado_en, usuarios_id)
      VALUES (?, ?, 0, ?, ?)
    `;

    db.query(sqlInsertarOTP, [codigoOTP, expiraEn, creadoEn, usuarioId], (errOTP, resultadoOTP) => {
      if (errOTP) {
        console.error('Error al guardar el OTP:', errOTP);
        return res.status(500).json({ ok: false, msg: 'Error al generar el token OTP.' });
      }

      return res.status(201).json({
        ok: true,
        msg: 'Código OTP generado exitosamente.',
        data: {
          token_id: resultadoOTP.insertId,
          codigo_simulado: codigoOTP,
          expira_en: expiraEn
        }
      });
    });
  });
};