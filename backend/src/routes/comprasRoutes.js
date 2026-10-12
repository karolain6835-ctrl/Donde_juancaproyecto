const router = require('express').Router();
const controlador = require('../controllers/comprasController');
router.get('/',controlador.obtenerCompras);
router.get('/:id',controlador.obtenerCompra);
router.post('/',controlador.crearCompra);
router.patch('/:id/recibir',controlador.recibirCompra);
router.patch('/:id/cancelar',controlador.cancelarCompra);
module.exports = router;
