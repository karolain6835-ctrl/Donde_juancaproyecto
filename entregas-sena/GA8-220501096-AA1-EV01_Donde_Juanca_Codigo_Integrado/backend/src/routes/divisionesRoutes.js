const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const divisionesController = require('../controllers/divisionesController');
router.get('/:id/pagos', autorizarRoles('Administrador','SuperAdmin','Mesero','Mesera','Cajero'), require('../controllers/divisionPagosController').listar);

// POST /api/sesiones-division
router.post('/', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), divisionesController.iniciarSesionDivision);

// POST /api/sesiones-division/:id/asignar-items (v2.19)
router.post('/:id/asignar-items', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), divisionesController.asignarItemsACliente);

// 3. GET /api/sesiones-division/:id (AQUÍ VA LA NUEVA RUTA)
router.get('/:id', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), divisionesController.obtenerResumenDivision);

router.post('/:id/cuotas', autorizarRoles('Administrador','SuperAdmin','Mesero','Mesera','Cajero'), divisionesController.definirCuotas);
router.patch('/:id/cancelar', autorizarRoles('Administrador','SuperAdmin','Cajero'), divisionesController.cancelarDivision);
router.patch('/:id/completar', autorizarRoles('Administrador','SuperAdmin','Cajero'), divisionesController.completarDivision);
module.exports = router;
