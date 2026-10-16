const router=require('express').Router();
const {autorizarRoles}=require('../middleware/rolesMiddleware');
const controller=require('../controllers/refrigeradoresController');
router.get('/',autorizarRoles('Administrador','SuperAdmin'),controller.listar);
router.post('/',autorizarRoles('Administrador','SuperAdmin'),controller.crear);
router.put('/:id',autorizarRoles('Administrador','SuperAdmin'),controller.editar);
module.exports=router;
