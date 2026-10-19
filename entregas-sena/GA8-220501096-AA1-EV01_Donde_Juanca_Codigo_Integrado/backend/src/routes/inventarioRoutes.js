const alertas = require('../controllers/alertasInventarioController');
const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

// Ruta para modificar las existencias de un producto
router.put('/actualizar-stock', autorizarRoles('Administrador', 'SuperAdmin'), inventarioController.actualizarStock);
router.get('/movimientos', autorizarRoles('Administrador', 'SuperAdmin'), inventarioController.obtenerMovimientos);

// Ruta para que el administrador vea qué alertas de stock hay encendidas
router.get('/alertas', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender'), inventarioController.obtenerAlertas);

router.get('/alertas/:id', autorizarRoles('Administrador','SuperAdmin','Mesero','Mesera','Bartender'), alertas.detalle);
router.patch('/alertas/:id/vista', autorizarRoles('Administrador','SuperAdmin','Mesero','Mesera','Bartender'), alertas.accion('vista'));
router.patch('/alertas/:id/silenciar', autorizarRoles('Administrador','SuperAdmin','Mesero','Mesera','Bartender'), alertas.accion('silenciar'));
router.patch('/alertas/:id/reactivar', autorizarRoles('Administrador','SuperAdmin','Mesero','Mesera','Bartender'), alertas.accion('reactivar'));
router.patch('/alertas/:id/resolver', autorizarRoles('Administrador','SuperAdmin','Mesero','Mesera','Bartender'), alertas.accion('resolver'));
module.exports = router;
