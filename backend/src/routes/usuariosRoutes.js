const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const autenticar = require('../middleware/authMiddleware');

// Ruta para registrar un nuevo empleado
router.post('/registrar', autenticar, autorizarRoles('Administrador', 'SuperAdmin'), usuariosController.registrarUsuario);

// Ruta para el inicio de sesión
router.post('/login', usuariosController.loginUsuario);

// Ruta para solicitar un código OTP para restablecimiento de contraseña
router.post('/auth/otp/solicitar', usuariosController.solicitarOTP);

// Ruta para cambiar el estado de un usuario
router.put('/:id/estado', autenticar, autorizarRoles('Administrador', 'SuperAdmin'), usuariosController.cambiarEstadoUsuario);

module.exports = router;
