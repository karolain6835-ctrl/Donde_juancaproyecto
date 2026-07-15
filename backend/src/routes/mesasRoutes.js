const express = require('express');
const router = express.Router();
const mesasController = require('../controllers/mesasController');

// Usamos "/:estado" para que sea una variable dinámica en la URL
router.get('/estado/:estado', mesasController.obtenerMesasPorEstado);

// Ruta para cambiar el estado de la mesa
router.patch('/:id/estado', mesasController.actualizarEstadoMesa);

module.exports = router;