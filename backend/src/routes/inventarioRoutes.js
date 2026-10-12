const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

// Ruta para modificar las existencias de un producto
router.put('/actualizar-stock', autorizarRoles('Administrador', 'SuperAdmin'), inventarioController.actualizarStock);
router.get('/movimientos', autorizarRoles('Administrador', 'SuperAdmin'), inventarioController.obtenerMovimientos);

// Ruta para que el administrador vea qué alertas de stock hay encendidas
router.get('/alertas', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender'), inventarioController.obtenerAlertas);

module.exports = router;
