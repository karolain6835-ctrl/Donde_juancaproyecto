const { autorizarRoles } = require('../middleware/rolesMiddleware');
const router = require('express').Router();
const controlador = require('../controllers/proveedoresController');
router.get('/', autorizarRoles('Administrador', 'SuperAdmin'), controlador.obtenerProveedores);
router.post('/', autorizarRoles('Administrador', 'SuperAdmin'), controlador.crearProveedor);
router.put('/:id', autorizarRoles('Administrador', 'SuperAdmin'), controlador.actualizarProveedor);
module.exports = router;
