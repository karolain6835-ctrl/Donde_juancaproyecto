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