# Historial de clientes

`GET /api/clientes/:id/historial?pagina=1&limite=20` comparte los roles de lectura de clientes: Administrador, SuperAdmin, Mesero, Mesera y Cajero. Máximo 100 pedidos por página, orden por fecha e ID descendentes. La lectura usa una transacción de snapshot consistente.

Relaciones utilizadas:

- `pedidos.clientes_id`: cliente asociado al pedido; no implica que haya consumido o pagado todo.
- `jugadores.clientes_id` con `sesion_mesa_id`: presencia en la visita. Para pedidos históricos sin sesión se exige `jugadores.pedido_id` y sesión nula. No se infieren visitas.
- `pedido_items.participante_id`: productos expresamente atribuidos al cliente, con precio histórico, excluyendo cancelados y referencias de pedido inconsistentes.
- `pagos.participante_id → division_participantes.jugadores_id → jugadores.clientes_id`: pagos verificados y pagados atribuibles al pagador, validando la división del pago y el ámbito del pedido.
- Juegos: la expresión compartida `pedidoJuegoSQL` resuelve el pedido actual o histórico sin duplicar cargos.

El total del pedido incluye productos y costos registrados de juegos. Es informativo y compartido, no deuda personal. Se marca provisional cuando un juego no está finalizado. Productos del cliente y pagos del cliente son sumas independientes: consumidor y pagador pueden diferir.

Se excluyen como atribución personal los juegos (sin FK a consumidor), pagos directos sin identidad del pagador, pagadores históricos sin `jugadores_id` y productos sin cliente identificado. No se asocia nada por nombre, correo, mesa coincidente ni proximidad temporal. No se calculan deuda personal ni estadísticas ficticias. La mesa mostrada es la relación actual del pedido; no se inventa una mesa histórica anterior a un traslado.

Las consultas se realizan por lote para la página, con un número constante de consultas y `EXISTS` para evitar duplicar pedidos. No hay migraciones ni escrituras de negocio.
