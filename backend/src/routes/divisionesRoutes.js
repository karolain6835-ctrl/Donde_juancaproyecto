const express = require('express');
const router = express.Router();
const divisionesController = require('../controllers/divisionesController');

// POST /api/sesiones-division
router.post('/', divisionesController.iniciarSesionDivision);

module.exports = router;