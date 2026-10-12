const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosController');

// Registrar un pago (procesar el cierre)
router.post('/', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), pagosController.registrarPago);

// Confirmar o rechazar un pago registrado y recalcular la liquidación.
router.patch('/:id/verificar', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), pagosController.verificarPago);

// Consultar los detalles de un pago realizado
router.get('/:id', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), pagosController.obtenerPagoPorId);

module.exports = router;
