const router = require('express').Router();
const controller = require('../controllers/recuperacionController');
const limit = require('../middleware/recuperacionLimiter').crearLimiter();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.post('/solicitar', limit('solicitar'), controller.solicitar);
router.post('/verificar', limit('verificar'), controller.verificar);
router.post('/restablecer', limit('restablecer'), controller.restablecer);
module.exports = router;
