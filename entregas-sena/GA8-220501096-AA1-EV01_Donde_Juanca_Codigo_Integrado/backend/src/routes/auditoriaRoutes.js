const express=require('express');
const {autorizarRoles}=require('../middleware/rolesMiddleware');
const controller=require('../controllers/auditoriaController');
const router=express.Router();
router.get('/',autorizarRoles('Administrador','SuperAdmin'),controller.listar);
module.exports=router;
