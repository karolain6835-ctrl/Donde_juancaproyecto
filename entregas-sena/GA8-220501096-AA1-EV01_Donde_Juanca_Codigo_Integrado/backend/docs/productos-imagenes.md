# Imágenes opcionales de productos — 2026-10-18

## Modelo e instalación

`v2.47_productos_imagen_opcional.sql` agrega `productos.imagen_url VARCHAR(180) NULL DEFAULT NULL` y un índice UNIQUE para que dos productos no compartan por accidente un mismo archivo. No hay backfill: productos existentes conservan NULL. No se modificaron migraciones históricas ni la implementación SMTP/OTP.

El plan de instalación nueva es v2.45 → v2.46 → v2.47. El manifiesto conserva las huellas anteriores y añade el checksum SQL y la nueva huella DDL de productos. Verificado en MariaDB 10.4.32 temporal: 51 tablas, 94 FK, 3 triggers, 1 rutina. MySQL 8 no certificado.

Para activar en una instalación existente compatible, aplicar **solo v2.47 una vez**, tras revisar el destino. No ejecutar la baseline de nuevo. No se aplicó la migración automáticamente a la base habitual durante este bloque.

## Almacenamiento y validación

- Archivos locales bajo `backend/uploads/productos/`, ignorados por Git. El proceso necesita permisos de lectura/escritura en esa carpeta.
- `PRODUCT_IMAGES_DIR` permite al operador definir otra carpeta persistente; no es un parámetro HTTP. Las pruebas la sustituyen por directorios temporales propios y los eliminan al terminar.
- Entrada multipart: un único campo archivo `imagen`, máximo **5 MB**, sin campos adicionales. Extensiones JPG/JPEG/PNG/WebP y MIME correspondiente.
- Sharp decodifica el contenido real y exige coincidencia de formato. Rechaza ejecutables, SVG, archivos falsos/corruptos, animaciones y más de 20 millones de píxeles.
- Se corrige orientación, se limita a 1200×1200 conservando proporción, se retiran metadatos y se recodifica a WebP. Nunca se conserva el archivo original suministrado.
- Nombre UUID generado por `crypto.randomUUID()`; escritura exclusiva sin sobrescribir. BD guarda solo `/uploads/productos/<UUID>.webp`, nunca una ruta solicitada por el cliente.
- La lectura solo admite ese patrón exacto, sin directorios, traversal ni otros tipos. Se sirve como `image/webp`, `nosniff`, CSP restrictiva y caché inmutable por nombre. Las imágenes son assets públicos para poder usarse en `<img>` sin poner JWT en URL; el catálogo y las escrituras mantienen autenticación.

No subir información sensible como imagen de producto. El despliegue debe preservar/respaldar esta carpeta junto con la BD y enrutar `/uploads/productos` al backend. No se utiliza almacenamiento externo ni infraestructura de CDN.

## API y permisos

| Método/ruta | Comportamiento |
| --- | --- |
| GET `/api/productos` y `/:id` | Conservan respuesta y agregan el campo nullable `imagen_url`. |
| POST `/api/productos` | Conserva contrato JSON, sin imagen obligatoria ni nuevo costo/stock. |
| PUT `/api/productos/:id` | Conserva contrato JSON; no altera la imagen existente. No admite establecer una ruta arbitraria como fuente de imagen. |
| PUT `/api/productos/:id/imagen` | Archivo multipart `imagen`; devuelve `datos: {id, imagen_url}`. |
| DELETE `/api/productos/:id/imagen` | Quita asociación y archivo correspondiente; repetir es seguro. Devuelve `imagen_url: null`. |
| GET `/uploads/productos/:archivo` | Lee solo el WebP de nombre generado; inexistente o ruta inválida: 404. |

Subir/quitar: únicamente Administrador y SuperAdmin, con el mismo JWT y autorización actuales. Un producto inexistente devuelve 404, exceso de tamaño 413, imagen inválida 415 y multipart incorrecto 400. Errores internos siguen siendo genéricos.

La asociación de imagen se actualiza en una transacción, bloqueando el producto. Un fallo de SQL/auditoría revierte la asociación y borra solo el archivo recién generado. Después del commit se limpia el anterior únicamente si ninguna fila lo referencia y su ruta cumple el patrón generado. La auditoría registra actor real y evento sin contenido binario ni nombre original del archivo.

BD y filesystem no forman una transacción distribuida: una interrupción abrupta o fallo de disco puede dejar un archivo sin referencia. Los errores de limpieza se registran en servidor. El borrado físico histórico del producto mantiene su flujo actual y no incorpora un barrido general de archivos; retirar su imagen antes si se necesita eliminar también el archivo. No se ejecuta un recolector que pueda borrar archivos ajenos.

## Frontend

- Miniatura en las tablas de Productos y Resumen de inventario, imagen grande en detalle y control opcional en creación/edición.
- Vista previa del producto seleccionado al agregarlo a un pedido; el selector, payload, stock y responsable no cambian. No se rediseña Nuevo Pedido.
- Placeholder con icono `Package` de Lucide, fondo verde/crema suave y texto accesible. Se usa cuando falta imagen, la ruta no es válida o falla la carga, evitando imagen rota.
- Permite subir/reemplazar, conservar y quitar al guardar. Las URL temporales de previsualización se revocan.
- Los datos JSON del producto y la imagen se guardan en dos operaciones explícitas. Si la segunda falla después de crear, el formulario conserva el ID y pasa a edición con aviso claro; reintentar no crea otro producto. Se vuelve a consultar el backend.
- Productos antiguos cuya respuesta no incluya el campo se adaptan a imagen NULL. Precio COP y reglas de CPP/stock permanecen intactos.

## Validación

```powershell
node e2e/backend-regression.cjs
node --test --test-concurrency=1 --test-timeout=60000 frontend-app/tests/*.test.js
npm.cmd --prefix frontend-app run lint
npm.cmd --prefix frontend-app run build
node e2e/run.cjs
git diff --check
```

Las pruebas usan BD/directorios aislados. Cubren los cuatro formatos, contenido falso, límite de píxeles/tamaño, permisos, URLs, conservación, reemplazo concurrente, rollback, quitar imagen sin afectar otro producto, placeholder y compatibilidad. La E2E crea un producto real, provoca un fallo controlado de red solo en la subida, reintenta sin duplicados, verifica la miniatura, conserva y elimina la imagen.

La primera E2E falló por un selector demasiado estricto de Precio de venta (incluye `$` en su nombre accesible); se corrigió el selector, no el formulario. La ejecución frontend en paralelo quedó abierta y fue detenida únicamente en su árbol de pruebas; la validación completa se repitió secuencialmente con límite de tiempo. No se ocultaron esos diagnósticos.

| Validación final | Resultado |
| --- | --- |
| Backend completo y SQL aislado | 581 aprobadas, 0 fallidas, 0 omitidas. |
| Frontend completo secuencial | 450 aprobadas, 0 fallidas, 0 omitidas. |
| E2E Chromium + API/BD reales | 10 aprobadas, 0 fallidas. |
| Lint / build | Aprobados; se conserva aviso de tamaño del bundle. |
| `git diff --check` | Sin errores. |

Total: **1.041 pruebas aprobadas**. Ningún archivo de `.postman/`, `postman/`, `entregas-sena/`, `mobile/` u `outputs/` se modifica o incluye en el commit.
