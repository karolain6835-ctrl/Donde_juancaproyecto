const router=require('express').Router();
const {autorizarRoles}=require('../middleware/rolesMiddleware');
const controller=require('../controllers/configuracionController');
router.get('/',autorizarRoles('Administrador','SuperAdmin'),controller.consultar);
router.put('/',autorizarRoles('Administrador','SuperAdmin'),controller.actualizar);
module.exports=router;
