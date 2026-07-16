const express = require('express');
const router = express.Router();
const kanbanController = require('../controllers/kanbanController');

// Ruta para ver el tablero Kanban (Listar pedidos por columnas de estado)
router.get('/tablero', kanbanController.obtenerPedidosKanban);

// Ruta para cambiar de columna un pedido (Ej: de 'pendiente' a 'en_preparacion')
router.put('/:id/estado', kanbanController.actualizarEstadoPedido);

module.exports = router;