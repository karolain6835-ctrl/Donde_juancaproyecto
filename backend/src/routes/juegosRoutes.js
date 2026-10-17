const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const juegosController = require('../controllers/juegosController');

router.get('/activos', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), juegosController.listarActivos);
router.get('/sesiones', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), juegosController.listarSesiones);
router.patch('/activos/:id/estado', autorizarRoles('Administrador', 'SuperAdmin'), juegosController.cambiarEstadoActivo);

// Iniciar una nueva partida
router.post('/iniciar', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera'), juegosController.iniciarJuego);

// Terminar una partida pasando el ID del juego por URL
router.put('/:id/terminar', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera'), juegosController.terminarJuego);

module.exports = router;
