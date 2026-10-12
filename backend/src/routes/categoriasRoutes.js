const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');

router.get('/', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero', 'Bartender'), categoriasController.obtenerCategorias);

module.exports = router;