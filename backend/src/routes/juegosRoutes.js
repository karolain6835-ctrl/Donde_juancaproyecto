const express = require('express');
const router = express.Router();
const juegosController = require('../controllers/juegosController');

// Iniciar una nueva partida
router.post('/iniciar', juegosController.iniciarJuego);

// Terminar una partida pasando el ID del juego por URL
router.put('/:id/terminar', juegosController.terminarJuego);

module.exports = router;