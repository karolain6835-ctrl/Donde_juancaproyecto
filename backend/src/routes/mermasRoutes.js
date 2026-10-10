const express = require('express');
const router = express.Router();
const mermasController = require('../controllers/mermasController');

router.post('/', mermasController.registrarMerma);
router.get('/motivos', mermasController.obtenerMotivos);
router.get('/', mermasController.obtenerMermas);

module.exports = router;
