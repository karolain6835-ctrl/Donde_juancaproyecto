const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const mermasController = require('../controllers/mermasController');

router.post('/', autorizarRoles('Administrador', 'SuperAdmin'), mermasController.registrarMerma);
router.get('/motivos', autorizarRoles('Administrador', 'SuperAdmin', 'Bartender'), mermasController.obtenerMotivos);
router.get('/refrigeradores', autorizarRoles('Administrador', 'SuperAdmin'), mermasController.obtenerRefrigeradores);
router.get('/', autorizarRoles('Administrador', 'SuperAdmin', 'Bartender'), mermasController.obtenerMermas);

module.exports = router;
