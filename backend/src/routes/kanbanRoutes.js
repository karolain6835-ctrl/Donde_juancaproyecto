const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const kanbanController = require('../controllers/kanbanController');

// Sub-rutas del Kanban
router.get('/simulado', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender'), kanbanController.obtenerPedidosKanban);
router.put('/:id/estado', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender'), kanbanController.actualizarEstadoPedido);
router.get('/tablero', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender'), kanbanController.obtenerTableroKanban);

module.exports = router;