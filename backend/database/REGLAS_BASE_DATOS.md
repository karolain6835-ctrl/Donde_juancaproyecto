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