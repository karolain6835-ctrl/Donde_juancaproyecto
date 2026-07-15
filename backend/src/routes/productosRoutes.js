const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');

// Obtener todos los productos
router.get('/', productosController.obtenerProductos);

// ESTA ES LA QUE FALTA O ESTÁ DANDO ERROR: Crear producto
router.post('/', productosController.crearProducto); 

module.exports = router;