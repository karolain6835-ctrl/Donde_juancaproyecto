# Endpoints simulados retirados de V1

Sin consumidores funcionales en frontend, se retiraron:

| Ruta heredada | Flujo real vigente |
| --- | --- |
| GET /api/kanban/simulado | GET /api/kanban/pedidos; GET /api/kanban/tablero |
| POST /api/ventas/pedido | POST /api/pedidos |

Las rutas retiradas responden 404 para una sesión autenticada. Ya no existen la función obtenerPedidosKanban ni ventasController.crearPedido, que devolvían datos ficticios. Los controladores compartidos permanecen por sus funciones reales.

Se conservan las transiciones reales de Kanban: PATCH /api/kanban/pedidos/:id/aceptar, PATCH /api/kanban/pedidos/:id/despachar-todo y PUT /api/kanban/:id/estado. La facturación y consulta de comprobantes bajo /api/ventas no cambian.

El frontend usa pedidosService y kanbanService; no tiene consumidores de las rutas retiradas. Se eliminó el permiso huérfano ventas.crearPedido sin cambiar permisos de creación real de pedidos. No se modificaron colecciones históricas de Postman ni entregas de evidencias.
