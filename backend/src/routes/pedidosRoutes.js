const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

// 1. Crear un nuevo pedido (Abrir la cuenta de la mesa)
router.post('/', pedidosController.crearPedido);

// 2. Agregar un producto a un pedido existente
router.post('/:id_pedido/items', pedidosController.agregarItemPedido);

// 3. Consultar la cuenta completa con sus detalles
router.get('/:id', pedidosController.obtenerPedidoConDetalles);

// 4. Calcular la cuenta consolidada (productos + juegos)
router.get('/:id/cuenta', pedidosController.obtenerCuentaConsolidada);

// 5. Cancelar un item del pedido y liberar stock
router.put('/items/:id/cancelar', pedidosController.cancelarItemPedido);

module.exports = router;