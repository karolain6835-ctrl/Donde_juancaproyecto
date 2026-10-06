const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');

// ==========================================
// CRUD DE PRODUCTOS
// ==========================================

// READ - Obtener todos los productos
router.get('/', productosController.obtenerProductos);

// READ - Obtener un producto por ID
router.get('/:id', productosController.obtenerProductoPorId);

// CREATE - Crear un producto
router.post('/', productosController.crearProducto);

// UPDATE - Actualizar un producto
router.put('/:id', productosController.actualizarProducto);

// DELETE - Eliminar un producto
router.delete('/:id', productosController.eliminarProducto);

module.exports = router;