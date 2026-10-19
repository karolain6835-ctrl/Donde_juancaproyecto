# Inventario de rutas (lectura estática del código actual)
No equivale a una prueba HTTP. Los roles se validan en cada router y en authMiddleware.
| Método | Ruta | Archivo |
|---|---|---|
| GET | /api/categorias | backend/src/routes/categoriasRoutes.js |
| GET | /api/productos | backend/src/routes/productosRoutes.js |
| GET | /api/productos/:id | backend/src/routes/productosRoutes.js |
| POST | /api/productos | backend/src/routes/productosRoutes.js |
| PUT | /api/productos/:id | backend/src/routes/productosRoutes.js |
| DELETE | /api/productos/:id | backend/src/routes/productosRoutes.js |
| PUT | /api/productos/:id/imagen | backend/src/routes/productoImagenRoutes.js |
| DELETE | /api/productos/:id/imagen | backend/src/routes/productoImagenRoutes.js |
| GET | /uploads/productos/:archivo | backend/src/routes/productoImagenArchivoRoutes.js |
| GET | /api/mesas/:id/sesion-activa/participantes | backend/src/routes/mesasRoutes.js |
| POST | /api/mesas/:id/sesion-activa/participantes | backend/src/routes/mesasRoutes.js |
| GET | /api/mesas/sesiones/:sesion_id/participantes/:participante_id/consumos | backend/src/routes/mesasRoutes.js |
| POST | /api/mesas | backend/src/routes/mesasRoutes.js |
| PATCH | /api/mesas/:id/numero | backend/src/routes/mesasRoutes.js |
| GET | /api/mesas/:id/liberacion | backend/src/routes/mesasRoutes.js |
| GET | /api/mesas/:mesa_id/cuenta | backend/src/routes/mesasRoutes.js |
| GET | /api/mesas/estado/:estado | backend/src/routes/mesasRoutes.js |
| PATCH | /api/mesas/:id/estado | backend/src/routes/mesasRoutes.js |
| POST | /api/mesas/traslado | backend/src/routes/mesasRoutes.js |
| GET | /api/pedidos/:pedido_id/division-contexto | backend/src/routes/pedidosRoutes.js |
| GET | /api/pedidos/:pedido_id/rondas | backend/src/routes/pedidosRoutes.js |
| GET | /api/pedidos/:pedido_id/rondas/:ronda_id | backend/src/routes/pedidosRoutes.js |
| POST | /api/pedidos/:pedido_id/rondas | backend/src/routes/pedidosRoutes.js |
| GET | /api/pedidos/:id/participantes | backend/src/routes/pedidosRoutes.js |
| POST | /api/pedidos/:id/participantes | backend/src/routes/pedidosRoutes.js |
| GET | /api/pedidos | backend/src/routes/pedidosRoutes.js |
| POST | /api/pedidos | backend/src/routes/pedidosRoutes.js |
| POST | /api/pedidos/:id_pedido/items | backend/src/routes/pedidosRoutes.js |
| GET | /api/pedidos/:id | backend/src/routes/pedidosRoutes.js |
| GET | /api/pedidos/:id/cuenta | backend/src/routes/pedidosRoutes.js |
| PUT | /api/pedidos/items/:id/cancelar | backend/src/routes/pedidosRoutes.js |
| GET | /api/pagos | backend/src/routes/pagosRoutes.js |
| POST | /api/pagos | backend/src/routes/pagosRoutes.js |
| PATCH | /api/pagos/:id/verificar | backend/src/routes/pagosRoutes.js |
| GET | /api/pagos/:id | backend/src/routes/pagosRoutes.js |
| GET | /api/juegos/activos | backend/src/routes/juegosRoutes.js |
| GET | /api/juegos/sesiones | backend/src/routes/juegosRoutes.js |
| PATCH | /api/juegos/activos/:id/estado | backend/src/routes/juegosRoutes.js |
| POST | /api/juegos/iniciar | backend/src/routes/juegosRoutes.js |
| PUT | /api/juegos/:id/terminar | backend/src/routes/juegosRoutes.js |
| PUT | /api/inventario/actualizar-stock | backend/src/routes/inventarioRoutes.js |
| GET | /api/inventario/movimientos | backend/src/routes/inventarioRoutes.js |
| GET | /api/inventario/alertas | backend/src/routes/inventarioRoutes.js |
| GET | /api/inventario/alertas/:id | backend/src/routes/inventarioRoutes.js |
| PATCH | /api/inventario/alertas/:id/vista | backend/src/routes/inventarioRoutes.js |
| PATCH | /api/inventario/alertas/:id/silenciar | backend/src/routes/inventarioRoutes.js |
| PATCH | /api/inventario/alertas/:id/reactivar | backend/src/routes/inventarioRoutes.js |
| PATCH | /api/inventario/alertas/:id/resolver | backend/src/routes/inventarioRoutes.js |
| POST | /api/mermas | backend/src/routes/mermasRoutes.js |
| GET | /api/mermas/motivos | backend/src/routes/mermasRoutes.js |
| GET | /api/mermas/refrigeradores | backend/src/routes/mermasRoutes.js |
| GET | /api/mermas | backend/src/routes/mermasRoutes.js |
| GET | /api/proveedores | backend/src/routes/proveedoresRoutes.js |
| POST | /api/proveedores | backend/src/routes/proveedoresRoutes.js |
| PUT | /api/proveedores/:id | backend/src/routes/proveedoresRoutes.js |
| GET | /api/compras | backend/src/routes/comprasRoutes.js |
| GET | /api/compras/:id | backend/src/routes/comprasRoutes.js |
| POST | /api/compras | backend/src/routes/comprasRoutes.js |
| PATCH | /api/compras/:id/recibir | backend/src/routes/comprasRoutes.js |
| PATCH | /api/compras/:id/cancelar | backend/src/routes/comprasRoutes.js |
| GET | /api/compras/:id/recepciones | backend/src/routes/comprasRoutes.js |
| GET | /api/compras/:id/recepciones/:recepcion_id | backend/src/routes/comprasRoutes.js |
| PATCH | /api/compras/:id/recepciones/:recepcion_id/reversar | backend/src/routes/comprasRoutes.js |
| PATCH | /api/compras/:id/cancelar-pendiente | backend/src/routes/comprasRoutes.js |
| GET | /api/clientes | backend/src/routes/clientesRoutes.js |
| GET | /api/clientes/:id/historial | backend/src/routes/clientesRoutes.js |
| PUT | /api/clientes/:id | backend/src/routes/clientesRoutes.js |
| POST | /api/clientes/registrar | backend/src/routes/clientesRoutes.js |
| GET | /api/clientes/:id | backend/src/routes/clientesRoutes.js |
| POST | /api/ventas/facturar | backend/src/routes/ventasRoutes.js |
| GET | /api/ventas/comprobantes | backend/src/routes/ventasRoutes.js |
| GET | /api/ventas/comprobantes/pedido/:pedido_id | backend/src/routes/ventasRoutes.js |
| GET | /api/ventas/comprobantes/:id | backend/src/routes/ventasRoutes.js |
| GET | /api/cierres-caja/resumen | backend/src/routes/cierresCajaRoutes.js |
| POST | /api/cierres-caja | backend/src/routes/cierresCajaRoutes.js |
| GET | /api/cierres-caja | backend/src/routes/cierresCajaRoutes.js |
| GET | /api/cierres-caja/:id | backend/src/routes/cierresCajaRoutes.js |
| GET | /api/usuarios/me | backend/src/routes/usuariosRoutes.js |
| PUT | /api/usuarios/me | backend/src/routes/usuariosRoutes.js |
| PUT | /api/usuarios/me/password | backend/src/routes/usuariosRoutes.js |
| GET | /api/usuarios | backend/src/routes/usuariosRoutes.js |
| GET | /api/usuarios/roles | backend/src/routes/usuariosRoutes.js |
| GET | /api/usuarios/responsables | backend/src/routes/usuariosRoutes.js |
| POST | /api/usuarios/registrar | backend/src/routes/usuariosRoutes.js |
| POST | /api/usuarios/login | backend/src/routes/usuariosRoutes.js |
| PUT | /api/usuarios/:id/estado | backend/src/routes/usuariosRoutes.js |
| POST | /api/usuarios/recuperacion/solicitar | backend/src/routes/recuperacionRoutes.js |
| POST | /api/usuarios/recuperacion/verificar | backend/src/routes/recuperacionRoutes.js |
| POST | /api/usuarios/recuperacion/restablecer | backend/src/routes/recuperacionRoutes.js |
| GET | /api/kanban/pedidos | backend/src/routes/kanbanRoutes.js |
| PATCH | /api/kanban/pedidos/:id/despachar-todo | backend/src/routes/kanbanRoutes.js |
| PATCH | /api/kanban/pedidos/:id/aceptar | backend/src/routes/kanbanRoutes.js |
| PUT | /api/kanban/:id/estado | backend/src/routes/kanbanRoutes.js |
| GET | /api/kanban/tablero | backend/src/routes/kanbanRoutes.js |
| GET | /api/sesiones-division/:id/pagos | backend/src/routes/divisionesRoutes.js |
| POST | /api/sesiones-division | backend/src/routes/divisionesRoutes.js |
| POST | /api/sesiones-division/:id/asignar-items | backend/src/routes/divisionesRoutes.js |
| GET | /api/sesiones-division/:id | backend/src/routes/divisionesRoutes.js |
| POST | /api/sesiones-division/:id/cuotas | backend/src/routes/divisionesRoutes.js |
| PATCH | /api/sesiones-division/:id/cancelar | backend/src/routes/divisionesRoutes.js |
| PATCH | /api/sesiones-division/:id/completar | backend/src/routes/divisionesRoutes.js |
| GET | /api/auditoria | backend/src/routes/auditoriaRoutes.js |
| GET | /api/configuracion | backend/src/routes/configuracionRoutes.js |
| PUT | /api/configuracion | backend/src/routes/configuracionRoutes.js |
| GET | /api/refrigeradores | backend/src/routes/refrigeradoresRoutes.js |
| POST | /api/refrigeradores | backend/src/routes/refrigeradoresRoutes.js |
| PUT | /api/refrigeradores/:id | backend/src/routes/refrigeradoresRoutes.js |
| GET | / | backend/src/index.js |

## Frontend
Rutas declaradas en App.jsx:
- `/login`
- `/`
- `/*`
- `/dashboard`
- `/operacion/mesas`
- `/operacion/pedidos`
- `/operacion/kanban`
- `/inventario`
- `/compras`
- `/juegos`
- `/caja`
- `/clientes`
- `/reportes`
- `/administracion`
- `*`
