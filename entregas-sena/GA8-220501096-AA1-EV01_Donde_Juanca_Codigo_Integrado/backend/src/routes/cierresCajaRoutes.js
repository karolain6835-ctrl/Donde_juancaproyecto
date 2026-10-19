const { autorizarRoles } = require('../middleware/rolesMiddleware');
const router=require('express').Router();
const c=require('../controllers/cierresCajaController');
router.get('/resumen', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), c.resumen);
router.post('/', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), c.crear);
router.get('/', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), c.listar);
router.get('/:id', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), c.detalle);
module.exports=router;
