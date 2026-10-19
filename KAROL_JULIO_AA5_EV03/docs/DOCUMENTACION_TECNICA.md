# Documentación técnica - GA7-220501096-AA5-EV03

## Arquitectura y recorrido de una solicitud
src/index.js carga dotenv, CORS y express.json, monta autenticación y routers, instala el middleware de errores y escucha en PORT o 5000. Las rutas delegan a controladores; estos consultan MySQL/MariaDB con mysql2. src/config/db.js configura la conexión mediante variables DB_*. Se incluyen todos los módulos importados para conservar el arranque.

## Rutas reales
| Método | Ruta | Controlador y función |
| --- | --- | --- |
| GET | /api/productos | productosController.js: obtenerProductos |
| GET | /api/productos/:id | productosController.js: obtenerProductoPorId |
| POST | /api/productos | productosController.js: crearProducto |
| PUT | /api/productos/:id | productosController.js: actualizarProducto |
| DELETE | /api/productos/:id | productosController.js: eliminarProducto |
| GET | /api/categorias | categoriasController.js: obtenerCategorias |
| PUT | /api/productos/:id/imagen | productoImagenController.js: subir |
| DELETE | /api/productos/:id/imagen | productoImagenController.js: quitar |
| GET | /uploads/productos/:archivo | productoImagenController.js: archivo |

GET de productos y categorías permite Administrador, SuperAdmin, Mesero, Mesera, Cajero y Bartender. Escrituras de productos e imágenes permiten Administrador y SuperAdmin. Las rutas /api requieren JWT HS256, issuer dondejuanca, sujeto válido, expiración y usuario activo consultado en usuarios JOIN roles. Fallos de autenticación producen 401; rol no autorizado 403; problemas internos de identidad 500. GET /uploads/productos/:archivo es público y solo acepta nombres WebP generados por el servicio.

## Contratos y estados previstos por el código (sin ejecución HTTP)
- GET /api/productos: 200 con mensaje, total, datos; SELECT con INNER JOIN categorias y ORDER BY p.nombre ASC. Solo muestra productos con categoría coincidente.
- GET /api/productos/:id: 200 con mensaje y datos; 404 si no hay fila.
- POST /api/productos: admite exclusivamente nombre, codigo, precio_venta, cantidad, stock_minimo, categorias_id y proveedores_id. nombre y codigo son textos no vacíos (máximos 150 y 50); precio_venta numérico finito mayor que cero; categorías positivas enteras; proveedor texto no vacío hasta 36. cantidad y stock_minimo opcionales son enteros no negativos hasta 2147483647. UUID generado en servidor; estado activo, CPP inicial 0 e historial_costos_id NULL. 201 con id_producto; 400 validación, 409 código duplicado, 404 FK inexistente, 500 error SQL.
- PUT /api/productos/:id: requiere nombre, codigo, precio_venta, estado, categorias_id y proveedores_id; stock_minimo por defecto 0. Actualiza únicamente los campos del UPDATE. cantidad se ignora con aviso; costo_promedio y costo_promedio_ponderado no se actualizan y generan aviso. imagen_url tampoco se actualiza aquí. 200, 400, 404, 409 o 500 según la rama real. La validación de PUT es menos estricta que la de POST: solo comprueba presencia de campos y Number(precio_venta)<=0; no garantiza rechazo previo de NaN ni tipos inválidos. No se corrigió este comportamiento.
- DELETE /api/productos/:id: eliminación física. 200 si afecta filas; 404 inexistente; 409 si hay referencias; 500 otros errores. No limpia automáticamente su archivo de imagen.
- GET /api/categorias: SELECT * FROM categorias; 200 con mensaje, total y datos; 500 error de consulta. No hay GET por ID, POST, PUT ni DELETE de categorías.
- PUT /api/productos/:id/imagen: multipart con un archivo imagen, hasta 5 MB, JPG/JPEG/PNG/WebP; validación real con sharp y recodificación WebP. 200 con datos {id, imagen_url}; 400 formato de solicitud, 404 producto inexistente, 413 tamaño, 415 archivo inválido, 500 error interno.
- DELETE /api/productos/:id/imagen: quita asociación, devuelve imagen_url null y limpia el archivo previo si corresponde. No admite datos adicionales. Actualización y auditoría transaccionales; la limpieza física posterior no es una transacción distribuida.
- GET /uploads/productos/:archivo: WebP existente o 404; errores internos 500.

Los códigos son ramas observadas en el código, no respuestas medidas. Los middlewares también pueden devolver errores antes del controlador.

## Consultas SQL exactas de productos y categorías
Extraídas de las declaraciones query de los controladores entregados. Los valores de entrada se pasan como parámetros ?, sin concatenación de esos valores.

### productosController.js

```sql
SELECT
      p.*,
      c.nombre AS categoria_nombre
    FROM productos p
    INNER JOIN categorias c
      ON p.categorias_id = c.id
    ORDER BY p.nombre ASC
```

```sql
SELECT
      p.*,
      c.nombre AS categoria_nombre
    FROM productos p
    INNER JOIN categorias c
      ON p.categorias_id = c.id
    WHERE p.id = ?
```

```sql
INSERT INTO productos (
      id,
      nombre,
      codigo,
      precio_venta,
      costo_promedio_ponderado,
      cantidad_disponible,
      stock_minimo,
      estado,
      categorias_id,
      proveedores_id,
      historial_costos_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

```sql
UPDATE productos
    SET
      nombre = ?,
      codigo = ?,
      precio_venta = ?,
      stock_minimo = ?,
      estado = ?,
      categorias_id = ?,
      proveedores_id = ?
    WHERE id = ?
```

```sql
DELETE FROM productos
    WHERE id = ?
```

### categoriasController.js

```sql
SELECT * FROM categorias
```

## Imágenes y persistencia
productoImagenController.js consulta SELECT id,imagen_url FROM productos WHERE id=? FOR UPDATE; actualiza UPDATE productos SET imagen_url=? WHERE id=? y consulta SELECT COUNT(*) AS n FROM productos WHERE imagen_url=? antes de limpiar archivos. La auditoría delega en auditoriaService.js. Los archivos usan UUID y se almacenan fuera de la BD; la BD conserva la URL relativa. PRODUCT_IMAGES_DIR permite configurar su directorio.

## Dependencias declaradas
- bcrypt: ^6.0.0
- cors: ^2.8.6
- dotenv: ^17.4.2
- express: ^5.2.1
- jsonwebtoken: ^9.0.3
- multer: ^2.4.0
- mysql2: ^3.23.1
- nodemailer: ^10.1.7
- sharp: ^0.35.5

## Diferencias y limitaciones encontradas
- docs/estado-v1.md original es histórico: indica ausencia de imágenes y de recuperación por correo. El código actual contiene ambos y migraciones posteriores v2.46 y v2.47. No trasladar sus resultados históricos de pruebas como validación de esta entrega.
- docs/productos-imagenes.md coincide con las rutas de imágenes inspeccionadas. Su expresión «no admite establecer una ruta arbitraria» debe interpretarse como que PUT general no persiste imagen_url: el controlador general no rechaza expresamente ese campo adicional, mientras POST sí usa una lista cerrada.
- Categorías solo ofrece consulta; no documentar un CRUD completo de categorías.
- La baseline no crea usuarios ni datos de catálogo; los servicios requieren preparar datos de evaluación en una base independiente. MySQL 8 no certificado según los archivos del proyecto.
- No se ejecutó npm ci, arranque del servidor, autenticación real, prueba HTTP ni SQL. La revisión es estática y de integridad de archivos. No se incluye PDF; esta fuente está lista para su exportación.

## Fuentes
src/index.js; src/routes/productosRoutes.js; src/routes/categoriasRoutes.js; src/routes/productoImagenRoutes.js; src/routes/productoImagenArchivoRoutes.js; src/controllers/productosController.js; src/controllers/categoriasController.js; src/controllers/productoImagenController.js; src/middleware/authMiddleware.js; src/middleware/rolesMiddleware.js; src/config/db.js; package.json; SQL de instalación incluidos. Documentación histórica contrastada en el proyecto original, sin modificarla.
