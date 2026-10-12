const router=require('express').Router();
const c=require('../controllers/cierresCajaController');
router.get('/resumen',c.resumen);
router.post('/',c.crear);
router.get('/',c.listar);
router.get('/:id',c.detalle);
module.exports=router;
