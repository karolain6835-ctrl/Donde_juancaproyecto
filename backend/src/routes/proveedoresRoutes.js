const router = require('express').Router();
const controlador = require('../controllers/proveedoresController');
router.get('/',controlador.obtenerProveedores);
router.post('/',controlador.crearProveedor);
router.put('/:id',controlador.actualizarProveedor);
module.exports = router;
