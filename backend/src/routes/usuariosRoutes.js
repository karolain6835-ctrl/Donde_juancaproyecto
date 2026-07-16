const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');

// Ruta para registrar un nuevo empleado
router.post('/registrar', usuariosController.registrarUsuario);

// Ruta para el inicio de sesión
router.post('/login', usuariosController.loginUsuario);

module.exports = router;