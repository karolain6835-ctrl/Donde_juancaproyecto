const express = require('express');
const router = express.Router();
const divisionesController = require('../controllers/divisionesController');

// POST /api/sesiones-division
router.post('/', divisionesController.iniciarSesionDivision);

// POST /api/sesiones-division/:id/asignar-items (v2.19)
router.post('/:id/asignar-items', divisionesController.asignarItemsACliente);

module.exports = router;