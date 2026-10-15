# Registro de Cambios (Changelog) - Base de Datos Donde Juanca

Todas las modificaciones estructurales y de datos importantes de la base de datos se documentarán en este archivo, siguiendo un orden cronológico inverso (lo más nuevo arriba).

---
## [v2.36] - 2026-10-13
### Preparada; pendiente de aplicar a la base persistente
- `productos.historial_costos_id` admite NULL al crear sin historial legado previo.
- Conserva la FK y los historiales existentes. CPP inicial en cero; recepciones sin cambios.

## [v2.35] - 2026-10-13
### Preparada; pendiente de aplicar a la base persistente
- Episodios persistentes de alertas, snapshots, actores e historial.
- UNIQUE de episodio abierto; sincronizacion central por triggers de productos.
- Observacion inicial con fecha actual; alertas historicas permanecen legado.

## [v2.34 / v2.33 / v2.32 / v2.31] - 2026-10-12
### Preparadas; pendientes de aplicar a la base persistente
- v2.31: estados, modelo legado/v2, cantidades canceladas e indice de compras.
- v2.32: version de inventario y trigger para todo cambio de existencias o CPP.
- v2.33: recepciones y lineas, idempotencia, actores y movimientos de reverso.
- v2.34: historial financiero de recepciones y reversos.
- Sin backfill de recepciones, fechas, cantidades ni costos historicos.

## [v2.30] - 2026-10-12
### Añadido (preparado; pendiente de aplicación a MySQL)
- `v2.30_create_tabla_cierre_pagos.sql`: crea la relación cierre-pago con snapshot
  de importe, método y fecha de inclusión; UNIQUE por pago, FK e índice por cierre/método.
- No asocia pagos históricos automáticamente ni crea cierres.

## [v2.29] - 2026-10-12
### Añadido (preparado; pendiente de aplicación a MySQL)
- `v2.29_agregar_verificado_en_pagos.sql`: agrega fecha de verificación nullable
  e índice por estado/verificación/fecha/ID. No asigna fechas históricas.
- El registro de verificado_en en pagosController queda pendiente; sin cambios de aplicación.

## [v2.28] - 2026-10-12
### Añadido (preparado; pendiente de aplicación a MySQL)
- `v2.28_agregar_periodo_cierres_caja.sql`: agrega inicio y fin nullable, índice
  de período y CHECK que exige ambos NULL o un intervalo con inicio anterior al fin.
- No asigna períodos a cierres históricos.

## [v2.27] - 2026-10-12
### Modificado (preparado; pendiente de aplicación a MySQL)
- `v2.27_modificar_importes_cierres_caja.sql`: amplía los cuatro importes de cierre
  a DECIMAL(12,2), conservando la diferencia con signo. Sin UPDATE ni backfill.

## [v2.26] - 2026-10-12
### Añadido (preparado; pendiente de aplicación a MySQL)
- `v2.26_create_tabla_comprobante_items.sql`: crea el detalle congelado de
  comprobantes, con referencia polimórfica sin FK, descripción, cantidad e importes.
- Agrega unicidad por comprobante/renglón y comprobante/tipo/referencia, FK a
  comprobantes y CHECK de cantidades e importes. No crea detalles históricos.

## [v2.25] - 2026-10-12
### Añadido (preparado; pendiente de aplicación a MySQL)
- `v2.25_create_tabla_comprobantes.sql`: crea cabeceras con UUID técnico,
  consecutivo visible, pedido único, snapshot del nombre del cliente, emisor,
  fecha de emisión e importes congelados DECIMAL(12,2).
- Agrega FK, índices y CHECK de coherencia de importes. No crea comprobantes
  históricos ni agrega campos fiscales. Requiere validación de liquidación en backend.

## [v2.24] - 2026-10-12
### Modificado (preparado; pendiente de aplicación a MySQL)
- `v2.24_modificar_pagos_total_seleccionado.sql`: amplía el importe de pagos de
  DECIMAL(10,0) a DECIMAL(12,2), conservando diez dígitos enteros y añadiendo centavos.
- Sin UPDATE ni backfill. El controlador de pagos permanece sin cambios y todavía
  rechaza importes fraccionarios; su adaptación queda pendiente.

## [v2.23] - 2026-10-11
### Añadido (preparado; no aplicado a MySQL)
- `v2.23_sesiones_juego_tiempos_tarifa.sql`: agrega `fecha_inicio`, `fecha_fin`
  y `tarifa_hora_aplicada`, nullable y con DEFAULT NULL para conservar históricos
  sin inventar fechas ni tarifas. No ejecuta UPDATE sobre sesiones existentes.
- Permite NULL en `cerrada_por`, conservando su FK y los valores existentes.
- Agrega índices por activo/estado, mesa/estado y estado/inicio/ID.
- Conserva `pedido_items_id`, estados y demás FK. Sin cambios de aplicación.

## [v2.22] - 2026-10-09
### Añadido (preparado; pendiente de aplicación en tablas persistentes)
- `v2.22_movimientos_inventario_trazabilidad.sql`: fecha nullable, referencia
  polimórfica nullable e índice por fecha/ID. No rellena registros históricos.
- Los movimientos nuevos usan UTC. Venta negativa significa salida por pedido;
  venta positiva significa reversión por cancelación. La referencia es pedidos.id.
- Ajustes sin entidad propia mantienen referencia_id NULL. El usuario del
  movimiento de pedido es su responsable, no una identidad autenticada del ejecutor.

## [v2.21] - 2026-10-09
### Añadido (preparado; no aplicado a los datos existentes)
- `v2.21_passwords_desarrollo.sql`: actualización parametrizada y optativa de
  `usuarios.password_hash`, ejecutada por `scripts/inicializar-login-desarrollo.js`.
- El inicializador genera bcrypt con sal por usuario, conserva hashes válidos,
  exige entorno de desarrollo/prueba para aplicar y muestra vista previa por defecto.
- No modifica el esquema, estados, roles, OTP ni migraciones anteriores.

## Versión 10. - 2026-07-15
### Añadido
- Endpoint `POST /api/productos` completamente funcional y conectado a MySQL.
- Script de inicialización de datos base (`roles`, `usuarios`, `compras`, `historial_costos`) ejecutado con éxito para mantener la integridad relacional de la base de datos.

### Corregido
- Error 1046: Selección por defecto del Schema `mydb` en MySQL Workbench.
- Error 1452: Restricciones de llave foránea al insertar productos sin dependencias previas.

## Versión 8.1 - 2026-07-15
Implementación de Controladores y Rutas para Mesas: Se desarrolló la lógica para la gestión de estados de mesas (PATCH) y se configuró el entorno de pruebas con Thunder Client para validación de API.

## Versión 8.2 - 2026-07-15
 Gestión de Inventario y Productos: Se habilitó el controlador y rutas para el listado (INNER JOIN con categorías) y creación de productos.

## Versión 8.3 - 2026-07-15
 Ajustes de Integridad de Base de Datos: Se realizó la configuración de registros base en las tablas de proveedores, categorias e historial_costos para cumplir con las restricciones de llaves foráneas y asegurar la correcta creación de productos.

## [v1.8] - 2026-07-15
### Modificado
- Estandarización de políticas de integridad referencial `ON UPDATE CASCADE` en las tablas transaccionales y de auditoría (`pagos`, `auditoria`, `pedidos`) para asegurar la trazabilidad del sistema ante cambios en identificadores maestros (Script: `v1.8_asegurar_integridad_transacciones.sql`).

## [v1.7] - 2026-07-15
### Modificado
- Aplicación de política `ON UPDATE CASCADE` en las relaciones jerárquicas críticas entre `clientes`-`usuarios` y `pedidos`-`mesas` para mantener la consistencia de los datos (Script: `v1.7_actualizar_politicas_update.sql`).

## [v1.6] - 2026-07-15
### Modificado
- Definición formal de políticas de integridad referencial (`ON DELETE RESTRICT`, `ON UPDATE CASCADE`) en la relación `productos`-`categorias` para prevenir la eliminación de datos con dependencias activas (Script: `v1.6_definir_politicas_referenciales.sql`). 

## [v1.5] - 2026-07-14
### Eliminado
- Se eliminó la restricción de tipo `UNIQUE` (`uq_descripcion`) en la tabla `categorias` mediante el script `v1.5_eliminar_restriccion_descripcion.sql`.

## [v1.4] - 2026-07-14
### Agregado
- Se agregó una restricción de seguridad temporal de tipo `UNIQUE` a la columna `descripcion` en la tabla `categorias` mediante el script `v1.4_agregar_restriccion_descripcion.sql`.

## [v1.3] - 2026-07-14
### Modificado
- Se modificó el tipo de dato de la columna `icono` en la tabla `categorias`. Pasó de `VARCHAR(50)` a `VARCHAR(255)` para soportar rutas de imágenes y URLs más largas (Script: `v1.3_modificar_tipo_dato_icono.sql`).

## [v1.2] - 2026-07-14
### Agregado
- Se simuló una migración estructural agregando la columna `icono` (tipo `VARCHAR(50)`) a la tabla `categorias`, con el fin de soportar elementos visuales en el frontend (Script: `v1.2_agregar_icono_categorias.sql`).

## [v1.1] - 2026-07-14
### Agregado
- Se insertaron los datos semilla (Seeders) iniciales del sistema, incluyendo los roles ('Administrador', 'Mesera') y las categorías principales del tomadero ('Cervezas', 'Licores', 'Snacks', etc.) (Script: `v1.1_semillas.sql`).

## [v1.0] - 2026-07-14
### Inicializado
- Se estableció el diseño y la estructura fundacional de la base de datos relacional para el sistema (Script: `v1.0_estructura.sql`).


## v2.43 ? 2026-10-15
- `v2.43_sesiones_juego_pedido_directo.sql`: agrega FK nullable de sesiones_juego.pedidos_id a pedidos, conserva FK/index historicos y permite pedido_items_id NULL.
- Backfill por referencias inequ?vocas del item; no infiere por mesa o fechas. Los cargos de historicos con item cancelado siguen excluidos.
- Aplicada y verificada en la base local: 1 sesion conservada y 1 referencia directa completada.
