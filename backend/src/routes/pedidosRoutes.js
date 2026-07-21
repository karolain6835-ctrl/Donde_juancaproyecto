const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

// 1. Crear un nuevo pedido (Abrir la cuenta de la mesa)
router.post('/', pedidosController.crearPedido);

// 2. Agregar un producto a un pedido existente (Añadir cervezas, picadas o juegos)
router.post('/:id_pedido/items', pedidosController.agregarItemPedido);

// 3. Consultar la cuenta completa con sus detalles (Ver la factura total de la mesa)
router.get('/:id', pedidosController.obtenerPedidoConDetalles);
// 
router.get('/:id/cuenta', pedidosController.obtenerCuentaConsolidada);

module.exports = router;