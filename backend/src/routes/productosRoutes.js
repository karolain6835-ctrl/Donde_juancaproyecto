const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');

// Ruta principal para obtener productos
router.get('/', productosController.obtenerProductos);

module.exports = router;