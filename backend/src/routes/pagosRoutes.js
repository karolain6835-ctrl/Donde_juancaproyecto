const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosController');

// Registrar un pago (procesar el cierre)
router.post('/', pagosController.registrarPago);

// Consultar los detalles de un pago realizado
router.get('/:id', pagosController.obtenerPagoPorId);

module.exports = router;