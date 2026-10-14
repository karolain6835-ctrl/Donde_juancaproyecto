# Administración mínima de mesas

Auditoría de esquema y datos (2026-10-14, solo lectura): `mesas.numero` es INT
NOT NULL, sin UNIQUE. Hay dos filas con numero=0. El único UNIQUE adicional al
ID es `codigo_qr`, nullable. `creado_en` es obligatorio. Estados conservados:
disponible, ocupada, en_cobro.

Las FKs de pedidos, jugadores, sesiones_juego, sesiones_division e
historial_cambios_mesa referencian `mesas.id`, ninguna referencia `numero`.
Renumerar solo el número visible es seguro para esas relaciones. No cambia el
ID, estado, cuenta ni actividad. No se modifican datos existentes al desplegar.

Antes existían lecturas por estado, cuenta/liberación, PATCH estado y POST
traslado. No existía alta ni renumeración.

- POST `/api/mesas`, body `{numero:12}`, respuesta 201
  `{datos:{id:'uuid',numero:12,estado:'disponible'}}`.
- PATCH `/api/mesas/:id/numero`, body `{numero:13}`, respuesta 200 con la misma
  estructura y el estado real conservado. Mesa ausente 404.

Ambos requieren JWT y rol Administrador/SuperAdmin. Solo aceptan `numero`,
entero positivo <=2147483647. Entradas inválidas 400, duplicado 409. No admiten
estado ni QR ni ID manual. Se registra auditoría atómica; un fallo revierte.

Sin UNIQUE, un GET_LOCK compartido por base de datos serializa altas y cambios
de número de esta API entre conexiones/instancias. Se valida duplicado con
lectura bloqueante dentro de la transacción. El bloqueo se libera después del
commit/rollback y al cerrar la conexión. Otros escritores directos de SQL no
siguen este protocolo: la garantía total requiere el futuro índice UNIQUE.

No se añade ese índice en esta fase ni se renumeran las dos Mesa 0 automáticamente.
Limpieza propuesta: inventariar IDs y números, acordar los números correctos,
renumerar cada ID explícitamente mediante la UI administrativa, revisar
`SELECT numero,COUNT(*) FROM mesas GROUP BY numero HAVING COUNT(*)>1`, detener
escrituras estructurales y crear una migración UNIQUE cuando no haya duplicados.
Si debe conservarse el número visible histórico, diseñar primero ese registro;
las consultas actuales muestran la numeración vigente.

No se implementa DELETE. Las reglas de liberación protegida y traslado no se
modifican; renumerar una mesa ocupada conserva su ocupación y todos los bloqueos
de cuenta pendientes. La UI reconsulta después de cada escritura confirmada.
