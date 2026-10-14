# Identidad de participantes (fase 7A)

Se evoluciona `jugadores`, sin renombrarla ni duplicar identidades. Sus IDs siguen
siendo los referenciados por `ronda_jugadores.jugadores_id`. No hay actualmente un
CRUD de jugadores que obligue a crear partidas para crear personas.

El ámbito nuevo es `jugadores.pedido_id`: una persona en ese pedido, incluso sin
consumo. No se interpreta la mesa como visita (una mesa se reutiliza y se traslada).
Todavía no existe una sesión general de visita fiable; introducirla aquí obligaría
a rediseñar cierres y pagos. Un futuro ámbito de visita podrá enlazar estos mismos
IDs. No usar `sesiones_juego` ni `rondas` para representar rondas de consumo.

`tipo_participante`: registrado con `clientes_id`, o temporal con nombre/alias y
cliente NULL. Jugadores históricos conservan pedido/tipo/cliente NULL. Ningún
histórico recibe una persona inferida. Clientes registrados se validan activos
dentro de la transacción. No se exige contacto a los temporales.

Aplicar `v2.37_participantes_pedidos.sql` y después
`v2.38_participantes_temporales_homonimos.sql` **antes de desplegar**
el código. Sigue el dialecto MariaDB existente (PERSISTENT, ADD IF NOT EXISTS).
Las migraciones conservan datos y FKs restrictivas. v2.38 elimina la unicidad
de alias temporales: dos personas del mismo nombre conservan IDs distintos.
Se mantiene UNIQUE por pedido/cliente registrado. No se ejecuta sobre la BD instalada
durante las pruebas: se valida sobre bases desechables.

## Contratos

- `GET /api/pedidos/:id/participantes` → 200 `{datos:[{id,nombre,tipo_participante,clientes_id,pedido_id}]}`.
  Roles: Administrador, SuperAdmin, Mesero, Mesera, Cajero.
- `POST /api/pedidos/:id/participantes` → 201 `{datos:{...}}`.
  Roles: Administrador, SuperAdmin, Mesero, Mesera.
  Body registrado: `{tipo_participante:'registrado',clientes_id:'id-real'}`.
  Body temporal: `{tipo_participante:'temporal',nombre:'Alias'}`.
  Pedido/cliente ausente 404; cliente inactivo, cliente registrado duplicado o pedido cerrado 409;
  identidad inválida 400. Todas las rutas conservan el JWT central existente.
- `POST /api/pedidos`: conserva mesa/responsable/cliente y respuesta. Inicializa
  el participante registrado en la misma transacción. Para temporal enviar
  `clientes_id:null,participante_temporal:{nombre:'Alias'}`; no crea cliente global.
- `POST /api/pedidos/:id/items`: acepta `participante_id` opcional/NULL. Si se
  informa debe pertenecer al pedido. El detalle devuelve `participante_id` y
  `participante_nombre` junto con los campos anteriores.

La consolidación requiere pedido + participante (igualdad NULL segura) + producto
+ precio + estado enviado/preparando. El bloqueo del pedido serializa altas, el
participante se bloquea antes del ítem y stock; solo se descuenta la cantidad
adicional. Cancelaciones y movimientos mantienen sus reglas. Sin asignar se
conserva el comportamiento legado. El traslado mueve también jugadores del
pedido abierto sin partidas, manteniendo IDs y asociaciones.

## Integraciones pendientes

No se modifican pagos, división, rondas ni juegos. La futura relación financiera
es `division_participantes.jugadores_id NULL REFERENCES jugadores(id) ON DELETE
RESTRICT ON UPDATE CASCADE`, sin deducir vínculos históricos por nombre. Deberá
validar que el participante pertenezca al pedido/visita de esa división y
conservar sus importes y estados. No se añade esa FK en esta fase.

Las futuras rondas de consumo referenciarán estos IDs. Las rondas de juego ya
pueden reutilizarlos mediante `ronda_jugadores.jugadores_id`; su API/integración
se deja para otra fase.
