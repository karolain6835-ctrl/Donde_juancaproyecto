const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

// Ruta para modificar las existencias de un producto
router.put('/actualizar-stock', inventarioController.actualizarStock);

// Ruta para que el administrador vea qué alertas de stock hay encendidas
router.get('/alertas', inventarioController.obtenerAlertas);

module.exports = router;