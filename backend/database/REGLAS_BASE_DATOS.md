Políticas de Modificación y Versionado de Base de Datos
Para garantizar la estabilidad del sistema del tomadero y evitar conflictos en el código colaborativo, todo ajuste en la base de datos debe regirse estrictamente por las siguientes cuatro normas:

1. El script inicial es intocable:
Bajo ninguna circunstancia se debe alterar, sobrescribir o modificar directamente el archivo v1.0_estructura.sql ni los datos del archivo v1.1_semillas.sql. Estos documentos representan los cimientos fundacionales del sistema y deben permanecer intactos como punto de referencia.

2. Cada cambio estructural genera una nueva migración:
Si los requerimientos del proyecto cambian (ej. agregar una columna, crear una tabla de "Torneos de Tejo" o cambiar un tipo de dato), se debe crear un archivo .sql totalmente nuevo e independiente. Este archivo contendrá únicamente las instrucciones exactas (ALTER, CREATE, etc.) para aplicar esa nueva mejora.

3. Historial inmutable (Prohibido eliminar):
Nunca se deben borrar los scripts antiguos. Si una tabla que se creó en la versión 1.2 ya no es necesaria, no se borra el archivo anterior; en su lugar, se crea un nuevo script v1.3_eliminar_tabla.sql que contenga el comando DROP TABLE. Esto asegura que cualquier miembro del equipo pueda reconstruir la base de datos desde cero sin errores.

4. Orden cronológico y nomenclatura estricta:
Todos los archivos dentro de la carpeta de bases de datos deben iniciar obligatoriamente con un prefijo de versión secuencial (v1.0_..., v1.1_..., v1.2_...). Esto asegura que al levantar el proyecto en un computador nuevo, el motor de la base de datos ejecute los eventos en la misma línea de tiempo exacta en la que fueron creados.

📖 Estrategia de Evolución de la Base de Datos
Para asegurar el crecimiento ordenado y sostenible del sistema "Donde Juanca", toda evolución del esquema se regirá por los siguientes lineamientos:

¿Cómo se agregarán nuevas tablas?
Cada nueva entidad (tabla) se creará en un archivo independiente dentro de /database/ con el prefijo vX.X_create_tabla_nombre.sql. Este archivo deberá contener únicamente la sentencia CREATE TABLE y debe ser ejecutado en orden cronológico en todos los entornos.

¿Cómo se modificarán columnas?
Se utilizará exclusivamente el comando ALTER TABLE ... MODIFY COLUMN o CHANGE COLUMN. Nunca se deben recrear tablas para modificar una columna, ya que esto pondría en riesgo los datos existentes. Cada modificación se registrará en su propio archivo de migración vX.X_modificar_columna.sql.

¿Cómo se eliminarán restricciones?
Las restricciones (FK, UNIQUE, CHECK) deben ser eliminadas mediante su nombre explícito utilizando ALTER TABLE ... DROP INDEX o DROP FOREIGN KEY. El script de eliminación debe indicar claramente qué restricción se retira y por qué, bajo el nombre vX.X_drop_nombre_restriccion.sql.

¿Cómo se actualizará la versión de la BD?
La actualización de versión sigue el Versionado Semántico (SemVer):

Versión Mayor (v2.0): Cambios estructurales masivos.

Versión Menor (v1.1): Nuevas funcionalidades o tablas.

Versión Parche (v1.0.1): Ajustes menores o correcciones.
Toda actualización debe reflejarse inmediatamente en el archivo CHANGELOG.md, indicando la fecha del cambio, la descripción técnica y el nombre del archivo .sql ejecutado.
Documentación en tu archivo de reglas
Para cumplir con la tarea 3.4.3, agrega esto a tu REGLAS_BASE_DATOS.md:

Políticas de Integridad Referencial:

ON DELETE RESTRICT: Se aplicará en todas las llaves foráneas que conecten tablas maestras (ej. Categorías) con tablas transaccionales (ej. Productos) para prevenir la eliminación accidental de registros con dependencias activas.

ON UPDATE CASCADE: Se aplicará en todas las relaciones para asegurar que cualquier modificación en un identificador único (Primary Key) se propague automáticamente a todas las referencias existentes, manteniendo la consistencia de los datos.

Actualización v1.6: Se aplicaron políticas de integridad referencial ON DELETE RESTRICT y ON UPDATE CASCADE en la relación entre productos y categorias para garantizar la consistencia de los datos.

## Verificación de Consistencia:
Se implementó un protocolo de validación mediante LEFT JOIN para identificar relaciones huérfanas en las entidades pedidos, productos y pagos. Los resultados confirmaron una integridad referencial del 100%, validando que todos los registros transaccionales están correctamente vinculados a sus entidades maestras.
## Instalación reproducible V1 — auditoría 2026-10-16

### Inventario y fuente de verdad

Hay 55 históricos: v1.0–v1.9 y v2.0–v2.44. El orden se compara por dos enteros, nunca alfabéticamente: v2.9 precede a v2.10. No hay versiones duplicadas ni contenidos completos idénticos no vacíos; v2.14/v2.15 repiten el ALTER de stock con distintos comentarios.

No existe ledger de migraciones. Git demuestra el contenido versionado, no qué se ejecutó íntegramente. Se conservaron byte por byte los 55 archivos y sus nombres: no puede descartarse que una herramienta externa los identifique por nombre.

`migraciones-v1.json` enumera versiones, nombres exactos, tamaños, SHA-256, tablas creadas/alteradas/referenciadas y observaciones. La extracción de dependencias es estática; no sustituye la prueba SQL real. El manifiesto también fija el plan de instalación y las huellas del DDL auditado. El instalador rechaza históricos modificados y archivos versionados fuera del manifiesto.

### Anomalías conservadas

| Versión/archivo | Hallazgo |
|---|---|
| V1.8_Asegurar integridad en transacciones críticas | Sin .sql y mayúscula inicial. Nombre conservado explícitamente. |
| v2.7_modulo_kanban.sql) | Extensión anómala; solo SELECT/documentación y estados obsoletos. |
| v2.20_pagos_division.sql | Cero bytes. No crea asociaciones. No rellenar retroactivamente. |
| v2.18_sesiones_division_cuentas.sql | Truncada en REFEREN; intenta divisiones_cuenta, no sesiones_division_cuentas requerida después. |
| v1.1 | Categorías sin IDs requeridos por el esquema base; semillas históricas. |
| v1.6 | FK/columna fk_producto_categoria/categoria_id no coinciden con fk_productos_categorias1/categorias_id. |
| v1.9, v2.0, v2.6, v2.8 | Mezcla de DDL y datos de prueba; v1.9/v2.6 usan columnas incompatibles. No cargar ejemplos nuevos. |
| v2.4 | Referencia facturas, ausente en base y esquema actual. V1 usa comprobantes. |
| v2.12 | usuarios_id INT contra usuarios.id VARCHAR; OTP instalado difiere, fuera del alcance V1. |
| v2.13 | Índice consultado en mydb fijo y VARCHAR de estado diferente del ENUM instalado. |
| v2.14/v2.15 | stock frente a cantidad_disponible canónica; encabezado v2.15 repetido. |
| v2.16/v2.17 | Procedimiento/vista legacy ausentes del esquema instalado; backend actual no los usa. |
| v2.19 | No crea sesiones_division_cuentas ni las FKs base de división. |
| v2.21 | Inicializador parametrizado optativo de credenciales de desarrollo, no DDL de instalación. |
| Base y posteriores | mydb fijo, VISIBLE de Workbench y extensiones MariaDB; no cadena portable a cualquier MySQL. |

Existen cambios de esquema sin transición histórica reproducible: alias de pedido_items, columnas de pagos/divisiones, auditoría operativa y nullable de cierres. **No puede darse por compensado v2.20 vacío únicamente por migraciones posteriores**: v2.41/v2.42 presuponen estructuras anteriores. La baseline nueva reproduce su forma persistida sin inventar contenido retroactivo.

### Plan nuevo: v2.45 exclusivamente para bases vacías

`v2.45_instalacion_limpia_v1.sql` es una baseline acumulativa, **no un parche incremental para una instalación existente**. Procede de SHOW CREATE del esquema local auditado, contrastado con las migraciones recientes y columnas críticas del backend. No exporta filas de negocio, contadores AUTO_INCREMENT, credenciales, DEFINER del equipo ni nombres de base fijos.

En el cierre V1 el manifiesto ejecutaba únicamente esa baseline, en este orden:

1. 50 tablas, índices y CHECKs sin FK.
2. 93 FK, con comprobaciones activas y todas las tablas disponibles.
3. sincronizar_alerta_inventario y los 3 triggers actuales.
4. Seis roles del sistema y configuración vacía (id=1).

**No ejecutar v1.0–v2.44 antes ni después de la baseline. No usar glob de *.sql ni --force.** No se renombraron, eliminaron ni rellenaron históricos. No se aplicó ningún cambio a la base habitual. Una actualización futura de bases existentes requiere una migración posterior con precondiciones explícitas y revisión de su esquema real.

### Instalación y verificación

Motor validado: **MariaDB 10.4.32**. MySQL 8 no está certificado. El instalador rechaza motores que no se identifiquen como MariaDB; otras versiones MariaDB requieren repetir la verificación.

Desde la raíz del repositorio, con las dependencias del backend instaladas:

```powershell
node backend/scripts/instalar-bd-v1.js --verify
node backend/scripts/instalar-bd-v1.js --install dondejuanca_v1_nueva
```

Se leen DB_HOST, DB_PORT, DB_USER y DB_PASSWORD del entorno/backend/.env. El destino es explícito y nunca DB_NAME habitual. --verify crea dj_v1_verify_<UUID>, instala, valida y elimina únicamente esa base en finally. --install rechaza tablas, vistas o rutinas preexistentes. Requiere permisos de creación de BD, tablas, FK, rutinas y triggers; verificación requiere DROP sobre su destino desechable. No imprime credenciales.

DDL no es atómica: una instalación explícita fallida puede dejar la base nueva parcial. Debe inspeccionarse ese destino aislado; no continuar sobre la base habitual. Una interrupción forzada también puede dejar la base temporal identificable por su nombre. No se elimina automáticamente ninguna base existente.

No se crean usuarios ni contraseñas, productos, proveedores, mesas o juegos ficticios. El primer administrador debe provisionarse por un operador autorizado con correo real y hash bcrypt costo 12; no existe contraseña predeterminada. Los catálogos operativos y motivos de merma deben parametrizarse con datos aprobados. No se importan automáticamente semillas históricas.

### Compatibilidad y límites

Se conserva el esquema actual, incluidas tablas legacy OTP, refrigerador_stock, juegos y sincronización; su presencia no habilita funcionalidades. No se corrige OTP ni se agregan relaciones por inferencia. Las FKs ausentes en relaciones históricas base de división siguen siendo una limitación; las validaciones backend permanecen intactas. Se valida que las 93 FK declaradas se construyan, no que toda relación lógica tenga FK.

Prueba real: base aislada creada sin errores SQL, 50 tablas/93 FK/3 triggers/1 rutina, SHA-256 de cada SHOW CREATE TABLE igual al auditado (ignorando contadores AUTO_INCREMENT), columnas críticas del backend y rechazo de segunda instalación. La base habitual solo se consultó para obtener metadatos.

Los checksums de archivos normalizan CRLF a LF antes de SHA-256 para permitir clones Windows/Linux con core.autocrlf. Esto no modifica archivos históricos. El tamaño en bytes del manifiesto es informativo del checkout auditado. Las huellas del DDL se calculan sobre SHOW CREATE, independientemente de los finales de línea del archivo SQL.

### Evolución post-V1 — v2.46 (2026-10-18)

El plan actual para una base nueva es **v2.45 → v2.46_recuperacion_password_segura.sql**. La baseline y los 55 históricos no se modifican. `posteriores` en el manifiesto agrega checksum, tabla, FK y huella DDL de la recuperación segura. La validación actual comprueba 51 tablas y 94 FK, además de los mismos 3 triggers y 1 rutina.

Para una base existente compatible se aplica únicamente v2.46, una sola vez y tras revisar el esquema del destino. No ejecutar v2.45 ni históricos de nuevo. La tabla `otp_tokens` permanece como legado sin escrituras; la recuperación usa una tabla nueva. Ver [operación y configuración SMTP](../docs/recuperacion-password-post-v1.md). Las pruebas de este bloque solo aplicaron DDL a bases temporales; la base habitual no fue migrada automáticamente.
