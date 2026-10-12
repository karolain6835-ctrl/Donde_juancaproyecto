const { autorizarRoles } = require('../middleware/rolesMiddleware');
const router = require('express').Router();
const controlador = require('../controllers/comprasController');
router.get('/', autorizarRoles('Administrador', 'SuperAdmin'), controlador.obtenerCompras);
router.get('/:id', autorizarRoles('Administrador', 'SuperAdmin'), controlador.obtenerCompra);
router.post('/', autorizarRoles('Administrador', 'SuperAdmin'), controlador.crearCompra);
router.patch('/:id/recibir', autorizarRoles('Administrador', 'SuperAdmin'), controlador.recibirCompra);
router.patch('/:id/cancelar', autorizarRoles('Administrador', 'SuperAdmin'), controlador.cancelarCompra);
module.exports = router;
