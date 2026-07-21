const express = require('express');
const router = express.Router();
const kanbanController = require('../controllers/kanbanController');

// Sub-rutas del Kanban
router.get('/simulado', kanbanController.obtenerPedidosKanban);
router.put('/:id/estado', kanbanController.actualizarEstadoPedido);
router.get('/tablero', kanbanController.obtenerTableroKanban);

module.exports = router;