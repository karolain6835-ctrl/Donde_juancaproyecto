const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

// Ruta para cargar consumos a una mesa/sesión (Crear pedido)
router.post('/pedido', ventasController.crearPedido);

// Emitir constancia de un pedido ya liquidado; no registra pagos.
router.post('/facturar', ventasController.generarFactura);
router.get('/comprobantes', ventasController.listarComprobantes);
router.get('/comprobantes/:id', ventasController.obtenerComprobante);

module.exports = router;
