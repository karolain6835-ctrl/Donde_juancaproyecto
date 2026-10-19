# Sesión de mesa / visita (fase 7B)

## Auditoría y modelo

`sesiones_activas` es autenticación (token/dispositivo/usuario),
`sesiones_juego` representa un uso de un activo con coste y estado propios,
y `sesiones_division` / `sesiones_division_cuentas` representan modalidades de
reparto financiero. Ninguna delimita la estadía completa de un grupo.
`mesas` es el recurso físico reutilizable. Se crea `sesiones_mesa` independiente.

Campos: id, mesas_id, estado activa/cerrada, iniciada_en UTC, cerrada_en nullable.
`mesa_activa` generada vale mesas_id solo para activa; UNIQUE impide dos visitas
activas por mesa en MariaDB, permitiendo muchas visitas cerradas.
CHECK exige fecha de cierre solo para cerradas. FK restrictivas e índices preservan
históricos. Aplicar v2.39 después de v2.38 antes de desplegar. Es repetible y no
crea ni reconstruye visitas históricas. Probada únicamente en bases desechables.

Pedidos nuevos enlazan `pedidos.sesion_mesa_id`. Jugadores nuevos enlazan la misma
sesión, con `pedido_id=NULL`. `jugadores.pedido_id` queda **deprecado para altas
nuevas**, pero se conserva con su FK/índice para históricos. Las lecturas y altas
de participantes en pedidos con sesión NULL continúan usando ese ámbito legado.
No se mezcla su identidad con una visita nueva inferida de la mesa o el nombre.

## Transacciones y ciclo de vida

La operación bloquea primero la mesa, resuelve/crea la visita activa y continúa
en la misma conexión/transacción. Altas de participantes e ítems nuevos bloquean
mesa/pedido y comprueban su ámbito. Para pedidos legados sin sesión se conserva
el bloqueo del pedido, sin exigir una visita que nunca existió.

Crear pedido, ocupar manualmente (también en_cobro) e iniciar juego aseguran una
visita activa. Fallos posteriores revierten también la visita recién creada.
Un cliente registrado usa UNIQUE(sesion_mesa_id,clientes_id): la creación de otro
pedido reutiliza su ID; agregarlo manualmente otra vez devuelve 409. Su estado
activo se valida en transacción. Temporales son distintos por ID, aunque tengan
el mismo nombre. Un pedido nuevo puede usar un `participante_id` de su visita
activa, sin crear otro temporal.

Liberar manualmente cierra la visita solo después de `evaluarLiberacionMesa`.
Se conservan todos los bloqueos existentes (pedido abierto, deuda, pagos
pendientes, juegos activos o importe no definitivo). El cierre automático ya
existente en `actualizarLiquidacion` recibe únicamente el mismo enlace de
sincronización; no cambia cálculos, pagos, estados financieros ni sus contratos.
No hay endpoint independiente de cierre ni de liberación forzada.

El traslado mueve la visita activa y todos sus participantes a la mesa destino,
conservando IDs y consumos. El destino no puede tener otra visita activa. Los
pedidos abiertos se mueven como antes; los cerrados mantienen su mesa histórica
y su enlace a la visita. Si un traslado legado no tiene visita, se inicia una
visita actual en destino sin asignarla retrospectivamente a sus pedidos.

## Endpoints y compatibilidad

- GET `/api/mesas/:id/sesion-activa/participantes` →
  `{sesion:{id,mesas_id,estado,iniciada_en,cerrada_en}|null,datos:[participantes]}`.
  Sin visita: 200, sesion NULL y datos vacíos; esta lectura nunca crea una visita.
- POST a la misma ruta → 201 `{sesion,datos:participante}`. Requiere visita activa
  y mesa ocupada/en_cobro. Sin visita devuelve 409, mesa inexistente 404.
- GET/POST `/api/pedidos/:id/participantes` conserva respuesta y autorización.
  Resuelve la sesión asociada, o el pedido para históricos NULL. POST exige
  pedido abierto y visita activa; GET permite consultar visitas cerradas.
- POST `/api/pedidos` mantiene respuesta, responsable y cliente de referencia.
  Con `participante_id` existente de la visita no genera otra identidad. Si se
  informa también clientes_id debe corresponder a esa persona. Para temporal
  existente: `{mesas_id,usuarios_id,clientes_id:null,participante_id}`.
- GET `/api/mesas/sesiones/:sesion_id/participantes/:participante_id/consumos` →
  `{datos:{sesion_mesa_id,participante,items,resumen_productos,total_consumido}}`.
  Rechaza identidades de otra sesión con 404. Funciona también para sesión cerrada.
  Suma subtotales cantidad*precio histórico de todos sus pedidos no cancelados
  y sus ítems no cancelados, incluidos pedidos cerrados. Importes en centavos
  enteros/decimal de dos posiciones, sin precio vigente ni coma flotante.
  Es **consumo de productos**, no saldo: no resta pagos ni atribuye juegos a una
  persona sin una relación fiable. No modifica ninguna fila.

Lecturas: Administrador, SuperAdmin, Mesero, Mesera, Cajero. Altas:
Administrador, SuperAdmin, Mesero, Mesera. JWT y roles centrales intactos.

Consolidación permanece por pedido + participante + producto + precio + estado
enviado/preparando. Compartir persona entre pedidos no fusiona sus ítems.
Kanban, inventario y pagos no se rediseñan. No se añaden rondas de consumo.

## Relaciones futuras

Los mismos `jugadores.id` podrán referenciarse desde división y rondas de consumo.
Una futura FK `division_participantes.jugadores_id` enlazará identidad, y su
ámbito deberá validarse contra la visita. Podrán añadirse `sesion_mesa_id` a
entidades de juego/división cuando se integren, sin reutilizar esas entidades
como visita ni deducir relaciones históricas por nombre.
