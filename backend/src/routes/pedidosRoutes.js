const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
router.get('/:pedido_id/division-contexto', autorizarRoles('Administrador','SuperAdmin','Mesero','Mesera','Cajero'), require('../controllers/divisionContextoController').obtener);
const pedidosController = require('../controllers/pedidosController');
const rondas = require('../controllers/rondasConsumoController');
router.get('/:pedido_id/rondas', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), rondas.listar);
router.get('/:pedido_id/rondas/:ronda_id', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), rondas.obtener);
router.post('/:pedido_id/rondas', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera'), rondas.confirmar);
const participantes = require('../controllers/participantesController');
router.get('/:id/participantes', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), participantes.listar);
router.post('/:id/participantes', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera'), participantes.agregar);

router.get('/', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), pedidosController.listarPedidos);

// 1. Crear un nuevo pedido (Abrir la cuenta de la mesa)
router.post('/', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera'), pedidosController.crearPedido);

// 2. Agregar un producto a un pedido existente
router.post('/:id_pedido/items', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera'), pedidosController.agregarItemPedido);

// 3. Consultar la cuenta completa con sus detalles
router.get('/:id', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), pedidosController.obtenerPedidoConDetalles);

// 4. Alias temporal de /api/mesas/:mesa_id/cuenta: `id` identifica una mesa.
router.get('/:id/cuenta', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), pedidosController.obtenerCuentaConsolidada);

// 5. Cancelar un item del pedido y liberar stock
router.put('/items/:id/cancelar', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), pedidosController.cancelarItemPedido);

module.exports = router;
