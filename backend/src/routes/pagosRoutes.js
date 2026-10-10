const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosController');

// Registrar un pago (procesar el cierre)
router.post('/', pagosController.registrarPago);

// Confirmar o rechazar un pago registrado y recalcular la liquidación.
router.patch('/:id/verificar', pagosController.verificarPago);

// Consultar los detalles de un pago realizado
router.get('/:id', pagosController.obtenerPagoPorId);

module.exports = router;
