# División de cuenta — fase 8A

Aplicar v2.41 después de v2.40 antes de desplegar este backend. La migración
solo añade columnas, índices y FK de visita/pagador; no infiere ni transforma
datos históricos. Las nuevas FK usan utf8_general_ci, igual que sus destinos,
aunque las tablas de división existentes usan utf8mb4. No se ejecutó contra
la base persistente durante la implementación.

## Contrato

JWT y roles existentes intactos: Administrador, SuperAdmin, Mesero, Mesera,
Cajero. POST /api/sesiones-division recibe {mesas_id,modalidad:'items'} y
obtiene la visita activa bajo bloqueo de mesa; sin visita devuelve 409.
Equitativa/total no están implementadas: nuevas solicitudes devuelven 400.

POST /api/sesiones-division/:id/asignar-items requiere Idempotency-Key ASCII
de 8 a 128 caracteres y exclusivamente:

```json
{"jugadores_id":"persona-real","items":[{"pedido_item_id":"producto-pedido","cantidad":2}]}
```

No recibe nombre ni precio: el nombre es snapshot de jugadores; el precio
proviene de pedido_items, nunca del catálogo actual. Calcula con centavos
BigInt de liquidacionService, serializa los importes nuevos como decimales.
GET conserva su estructura y tipos numéricos históricos de resumen, añadiendo
sesion_mesa_id y jugadores_id. La suma del resumen también usa centavos.

## Reglas

Consumidor = pedido_items.participante_id. Pagador = division_participantes.
jugadores_id. No se exige igualdad. Registrados y temporales son válidos si
pertenecen a la visita. Nuevas asignaciones necesitan visita activa, pedido
abierto de esa visita, producto no cancelado y referencias duales coherentes.
Cantidades estrictamente enteras positivas. Un mismo ID repetido en el body
se agrega antes de validar. La suma de todas las asignaciones (también otras
divisiones e históricos) no puede exceder cantidad_pedida. Históricos inválidos
requieren conciliación, no se ignoran ni se corrigen automáticamente.

Bloqueos mesa -> división -> visita/pagador -> productos/pedidos y asignaciones.
La mesa serializa divisiones de la misma visita; los productos bloqueados
protegen la capacidad. Lecturas actuales FOR UPDATE evitan snapshots obsoletos.
Transacción única para pagador, detalles y auditoría; cualquier fallo revierte.
Stock, cantidad_pagada, rondas y Kanban no se modifican al asignar.

La clave es única por división y se guarda con hash SHA-256 del body normalizado
y el pagador creado. Mismo body/clave devuelve 200 y mismo ID, incluso después
del cierre de visita; body distinto devuelve 409. Operación nueva devuelve 201.
No se presupone que dos claves distintas sean la misma intención: cada una
puede asignar unidades adicionales si hay capacidad.

Una operación/pagador contiene productos de un solo pedido; no se implementa
la distribución de un pago entre varios pedidos. Una división puede contener
varias operaciones de diferentes pedidos de la misma visita.

Pagos nuevos ligados a divisiones modernas deben indicar pagador. Registro y
verificación validan división/visita/pagador/pedido y las referencias, estado y
precio de sus asignaciones. Se mantienen límites de pago, reservas pendientes,
verificación, liquidación y liberación existentes. Los pagos de divisiones con
sesion_mesa_id NULL conservan su flujo anterior. Los históricos se pueden leer,
pero no reciben nuevas asignaciones inseguras ni visitas inferidas.

## Estado, traslados y límites

No se añade estado activa/completada/cancelada: completar/cancelar una división
implicaría reglas de pagos pendientes y liberación de unidades que esta fase
no define. El vínculo a visita evita reutilizar consumos de otra ocupación.
Se conserva el traslado existente de divisiones y la liberación basada en deuda
real; no se atribuye deuda por tener asignaciones. La limitación anterior de
divisiones históricas que bloquean destinos de traslado permanece pendiente
de una fase explícita de ciclo de vida, sin clasificar históricos arbitrariamente.

No se implementan reparto equitativo, importes personalizados, juegos divididos,
comprobantes individuales ni frontend. FK heredadas de detalle no se añaden sin
auditar referencias huérfanas: el backend valida su integridad al escribir/pagar.
