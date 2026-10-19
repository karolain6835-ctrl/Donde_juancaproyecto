const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');

// Misma declaración del endpoint original, sin montar las demás rutas de usuarios.
router.post('/login', usuariosController.loginUsuario);

module.exports = router;
