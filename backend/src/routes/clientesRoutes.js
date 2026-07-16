const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');

// Ruta para registrar un cliente
router.post('/registrar', clientesController.registrarCliente);

// Ruta para buscar un cliente específico por su ID/Cédula
router.get('/:id', clientesController.obtenerCliente);

module.exports = router;