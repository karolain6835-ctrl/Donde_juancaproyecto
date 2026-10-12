const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const mesasController = require('../controllers/mesasController');
const pedidosController = require('../controllers/pedidosController');

// Ruta canónica para la cuenta consolidada de una mesa (productos + juegos).
router.get('/:mesa_id/cuenta', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), pedidosController.obtenerCuentaConsolidada);

// Usamos "/:estado" para que sea una variable dinámica en la URL
router.get('/estado/:estado', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), mesasController.obtenerMesasPorEstado);

// Ruta para cambiar el estado de la mesa
router.patch('/:id/estado', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), mesasController.actualizarEstadoMesa);
// Ruta para trasladar la cuenta y juegos de una mesa a otra
router.post('/traslado', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera'), mesasController.trasladarMesa);

module.exports = router;
