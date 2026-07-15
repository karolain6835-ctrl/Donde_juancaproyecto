# Registro de Cambios (Changelog) - Base de Datos Donde Juanca

Todas las modificaciones estructurales y de datos importantes de la base de datos se documentarán en este archivo, siguiendo un orden cronológico inverso (lo más nuevo arriba).

---
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

