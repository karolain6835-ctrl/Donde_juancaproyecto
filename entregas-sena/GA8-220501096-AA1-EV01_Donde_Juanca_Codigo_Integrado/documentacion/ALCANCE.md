# Alcance y limitaciones

Incluidos React/Vite y Node.js/Express, controladores, servicios, middleware JWT y roles, configuración y contratos existentes. Módulos: usuarios/perfil/recuperación, productos/categorías/imágenes, mesas/sesiones/participantes, pedidos/rondas, Kanban, juegos y mantenimiento, inventario/alertas/mermas/refrigeradores, proveedores/compras/recepciones, clientes/historial, división de cuentas, pagos/verificación, comprobantes, cierres de caja, auditoría, configuración y consultas de reportes/dashboard del frontend. Ver RUTAS.md para métodos concretos.

Limitaciones: recuperación requiere SMTP y secreto HMAC independiente; sin configuración no envía correo. Registro de usuarios requiere administrador autenticado; la instalación limpia no tiene cuenta inicial. El script de login solo inicializa contraseñas de IDs de desarrollo existentes y no crea usuarios. Preparar el primer administrador mediante el procedimiento local del README. Comprobantes internos no implican certificación de facturación electrónica DIAN. Endpoints heredados GET /api/kanban/simulado y POST /api/ventas/pedido retirados. No se certifican aquí impresoras, carga, dispositivos reales, correo externo ni MySQL 8.

No se incluyó mobile (cliente adicional fuera del alcance web React solicitado), entregas anteriores, archivos subidos de usuarios, node_modules, .git, entornos reales ni artefactos de compilación. Los archivos e2e se entregan como referencia, no se ejecutaron porque requieren servicios y datos. La documentación de backend/docs describe revisiones previas: sus resultados históricos no son resultados de esta entrega.

Postman: se conservan las colecciones existentes en YAML nativo. Se retiraron tokens incrustados y credenciales de peticiones en la copia; configurar token, password_desarrollo y correo localmente. Las colecciones históricas pueden contener rutas retiradas, IDs de otra base o pruebas que crean/modifican registros: usarlas solo sobre una base de pruebas. No se ejecutaron contra la base actual.

Archivos de copia saneados:
- frontend-app/tests/auth-api.test.js
- frontend-app/tests/perfil.test.js
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Autenticación/POST -api-usuarios-login — Variante 1.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Autenticación/POST -api-usuarios-login — Variante 2.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Autenticación/POST -api-usuarios-login.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/GET -api-inventario-alertas — Variante 4.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/GET -api-inventario-alertas — Variante 5.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/GET -api-inventario-alertas — Variante 6.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/GET -api-inventario-alertas — Variante 7.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/GET -api-mermas-refrigeradores.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/PATCH -api-inventario-alertas-{{alerta_id}}-reactivar — Varian.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/PATCH -api-inventario-alertas-{{alerta_id}}-silenciar — Varian.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/PATCH -api-inventario-alertas-{{alerta_id}}-vista.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/PUT -api-inventario-actualizar-stock — Variante 3.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/PUT -api-inventario-actualizar-stock — Variante 4.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Inventario/PUT -api-inventario-actualizar-stock — Variante 5.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Productos/GET -api-categorias.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Productos/GET -api-productos-{{producto_id_3}}.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Productos/POST -api-productos — Variante 2.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Productos/POST -api-productos — Variante 3.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Productos/POST -api-productos — Variante 4.request.yaml
- postman/collections/Donde Juanca — GA7-220501096-AA5-EV02/Productos/PUT -api-productos-{{producto_id_3}} — Variante 1.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-categorias.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-clientes-registrar.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-clientes.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-compras-2.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-compras-3.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-compras-351d900e-8f97-4172-86e4-a7fa065e-1.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-compras-351d900e-8f97-4172-86e4-a7fa065e-2.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-compras-351d900e-8f97-4172-86e4-a7fa065e-3.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-compras-351d900e-8f97-4172-86e4-a7fa065e-4.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-compras-351d900e-8f97-4172-86e4-a7fa065e.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-inventario-actualizar-stock-3.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-inventario-actualizar-stock-4.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-inventario-actualizar-stock-5.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-inventario-alertas-1057a544-c6c8-11f1-a0-1.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-inventario-alertas-1057a544-c6c8-11f1-a0-2.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-inventario-alertas-1057a544-c6c8-11f1-a0.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-inventario-alertas-4.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-inventario-alertas-5.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-inventario-alertas-6.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-inventario-alertas-7.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-mermas-refrigeradores.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-pedidos-act-001-cuenta.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-productos-1.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-productos-2.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-productos-3.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-productos-4.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-productos-a32745cb-091f-4e02-9ea2-87f4d6-1.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-productos-a32745cb-091f-4e02-9ea2-87f4d6.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-proveedores-1.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-usuarios-auth-otp-solicitar.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-usuarios-login-1.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-usuarios-login-2.request.yaml
- postman/collections/Pruebas Donde juanca/http-localhost-5000-api-usuarios-login.request.yaml
