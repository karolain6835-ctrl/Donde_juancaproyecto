# Registro de Cambios (Changelog) - Base de Datos Donde Juanca

Todas las modificaciones estructurales y de datos importantes de la base de datos se documentarán en este archivo, siguiendo un orden cronológico inverso (lo más nuevo arriba).

---
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

