const { autorizarRoles } = require('../middleware/rolesMiddleware');
const express = require('express');
const router = express.Router();
const mesasController = require('../controllers/mesasController');
const pedidosController = require('../controllers/pedidosController');
const administracion = require('../controllers/mesasAdministracionController');
const visitas = require('../controllers/sesionesMesaController');
router.get('/:id/sesion-activa/participantes', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), visitas.listar);
router.post('/:id/sesion-activa/participantes', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera'), visitas.agregar);
router.get('/sesiones/:sesion_id/participantes/:participante_id/consumos', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), visitas.consumos);
router.post('/', autorizarRoles('Administrador', 'SuperAdmin'), administracion.crear);
router.patch('/:id/numero', autorizarRoles('Administrador', 'SuperAdmin'), administracion.editarNumero);
router.get('/:id/liberacion', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), mesasController.consultarLiberacionMesa);

// Ruta canónica para la cuenta consolidada de una mesa (productos + juegos).
router.get('/:mesa_id/cuenta', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), pedidosController.obtenerCuentaConsolidada);

// Usamos "/:estado" para que sea una variable dinámica en la URL
router.get('/estado/:estado', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero'), mesasController.obtenerMesasPorEstado);

// Ruta para cambiar el estado de la mesa
router.patch('/:id/estado', autorizarRoles('Administrador', 'SuperAdmin', 'Cajero'), mesasController.actualizarEstadoMesa);
// Ruta para trasladar la cuenta y juegos de una mesa a otra
router.post('/traslado', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera'), mesasController.trasladarMesa);

module.exports = router;
