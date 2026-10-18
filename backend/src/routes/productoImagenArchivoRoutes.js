const router=require('express').Router();
const controller=require('../controllers/productoImagenController');
router.get('/:archivo',controller.archivo);
module.exports=router;
