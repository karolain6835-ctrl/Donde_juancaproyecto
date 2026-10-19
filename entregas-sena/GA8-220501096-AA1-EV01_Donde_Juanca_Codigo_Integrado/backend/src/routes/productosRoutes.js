const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');

// ==========================================
// CRUD DE PRODUCTOS
// ==========================================

// READ - Obtener todos los productos
router.get('/', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero', 'Bartender'), productosController.obtenerProductos);

// READ - Obtener un producto por ID
router.get('/:id', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero', 'Bartender'), productosController.obtenerProductoPorId);

// CREATE - Crear un producto
router.post('/', autorizarRoles('Administrador', 'SuperAdmin'), productosController.crearProducto);

// UPDATE - Actualizar un producto
router.put('/:id', autorizarRoles('Administrador', 'SuperAdmin'), productosController.actualizarProducto);

// DELETE - Eliminar un producto
router.delete('/:id', autorizarRoles('Administrador', 'SuperAdmin'), productosController.eliminarProducto);

module.exports = router;