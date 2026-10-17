const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');

router.get('/', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), clientesController.listarClientes);
router.get('/:id/historial', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), clientesController.historialCliente);
router.put('/:id', autorizarRoles('Administrador', 'SuperAdmin'), clientesController.actualizarCliente);

// Ruta para registrar un cliente
router.post('/registrar', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), clientesController.registrarCliente);

// Ruta para buscar un cliente específico por su ID/Cédula
router.get('/:id', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), clientesController.obtenerCliente);

module.exports = router;
