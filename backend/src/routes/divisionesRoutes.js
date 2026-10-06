const express = require('express');
const router = express.Router();
const divisionesController = require('../controllers/divisionesController');

// POST /api/sesiones-division
router.post('/', divisionesController.iniciarSesionDivision);

// POST /api/sesiones-division/:id/asignar-items (v2.19)
router.post('/:id/asignar-items', divisionesController.asignarItemsACliente);

// 3. GET /api/sesiones-division/:id (AQUÍ VA LA NUEVA RUTA)
router.get('/:id', divisionesController.obtenerResumenDivision);

module.exports = router;