const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const kanbanController = require('../controllers/kanbanController');

// Sub-rutas del Kanban
router.get('/pedidos', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender'), kanbanController.obtenerPedidosAgrupados);
router.patch('/pedidos/:id/despachar-todo', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender'), kanbanController.despacharTodo);
router.patch('/pedidos/:id/aceptar', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender'), kanbanController.aceptarPedido);
router.put('/:id/estado', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender'), kanbanController.actualizarEstadoPedido);
router.get('/tablero', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender'), kanbanController.obtenerTableroKanban);

module.exports = router;
