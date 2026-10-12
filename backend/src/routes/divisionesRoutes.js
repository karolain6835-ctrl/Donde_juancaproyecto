const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const divisionesController = require('../controllers/divisionesController');

// POST /api/sesiones-division
router.post('/', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), divisionesController.iniciarSesionDivision);

// POST /api/sesiones-division/:id/asignar-items (v2.19)
router.post('/:id/asignar-items', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), divisionesController.asignarItemsACliente);

// 3. GET /api/sesiones-division/:id (AQUÍ VA LA NUEVA RUTA)
router.get('/:id', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), divisionesController.obtenerResumenDivision);

module.exports = router;