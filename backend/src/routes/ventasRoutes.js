const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

// Ruta para cargar consumos a una mesa/sesión (Crear pedido)
router.post('/pedido', ventasController.crearPedido);

// Ruta para liquidar la cuenta y pagar (Facturar)
router.post('/facturar', ventasController.generarFactura);

module.exports = router;