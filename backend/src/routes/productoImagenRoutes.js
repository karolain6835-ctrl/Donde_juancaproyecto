const router=require('express').Router();
const {autorizarRoles}=require('../middleware/rolesMiddleware');
const controller=require('../controllers/productoImagenController');
const upload=require('../middleware/imagenProductoUpload');
router.put('/:id/imagen',autorizarRoles('Administrador','SuperAdmin'),upload,controller.subir);
router.delete('/:id/imagen',autorizarRoles('Administrador','SuperAdmin'),controller.quitar);
module.exports=router;
