const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

// Ruta para cargar consumos a una mesa/sesión (Crear pedido)
router.post('/pedido', autorizarRoles('Administrador', 'SuperAdmin'), ventasController.crearPedido);

// Emitir constancia de un pedido ya liquidado; no registra pagos.
router.post('/facturar', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), ventasController.generarFactura);
router.get('/comprobantes', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), ventasController.listarComprobantes);
router.get('/comprobantes/pedido/:pedido_id', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), ventasController.comprobantePorPedido);
router.get('/comprobantes/:id', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), ventasController.obtenerComprobante);

module.exports = router;
