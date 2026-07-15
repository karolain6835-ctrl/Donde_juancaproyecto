const express = require('express');
const router = express.Router();
const mesasController = require('../controllers/mesasController');

// Usamos "/:estado" para que sea una variable dinámica en la URL
router.get('/estado/:estado', mesasController.obtenerMesasPorEstado);

module.exports = router;