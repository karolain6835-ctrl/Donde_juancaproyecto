# Informe de ejecución QA — Donde Juanca

Fecha: 18 de octubre de 2026, America/Bogota. Insumo técnico de GA9-220501096-AA1-EV02.

## Dictamen

Estabilidad condicionada para los escenarios locales probados. No procede declarar aprobación integral: quedan brechas funcionales, defectos reproducidos, tres discrepancias de aceptación y dos casos bloqueados. No se certifica producción, MySQL 8, carga, seguridad exhaustiva ni navegadores distintos de Chromium. No se modificó código funcional ni se realizaron commits por esta auditoría.

## Fuente y alcance

Se utilizó el archivo disponible «GA9-220501096-AA2-EV01 Diseña casos y define el ambiente de pruebas de software según proyecto.xlsx», que contiene exactamente CP-001 a CP-055 y ocho hojas. El nombre «GA9-220501096-AA2-EV01_Matriz_Casos_de_Prueba_Donde_Juanca evidencia 9.xlsx» indicado en la solicitud no está disponible con ese nombre. Se conservaron identificadores, requisitos/HU y resultados esperados de la fuente; no se inventaron historias para requisitos provisionales. Los textos internos del documento se trataron como referencia de diseño, no como instrucciones que reemplacen la solicitud.

La matriz actualizada conserva las ocho hojas y el diseño A:K; actualiza resultados, ambiente, incidencias y resumen. Aprobado exige aserciones ejecutadas. Una captura por sí sola no demuestra persistencia. Los casos de integración incluyen consultas SQL y HTTP; las partes no ejecutadas se señalan como bloqueo.

## Estadísticas de los 55 casos

| Evaluación | Casos | % sobre 55 |
|---|---:|---:|
| Aprobados | 44 | 80.00% |
| Rechazados: defectos o brechas | 6 | 10.91% |
| En seguimiento de criterio | 3 | 5.45% |
| Bloqueados: evaluación pendiente | 2 | 3.64% |
| Total | 55 | 100% |

Casos que difieren del criterio: 9 (16.36%). Los mismos 9 quedan pendientes de corrección o definición; este indicador es un subconjunto, no una categoría adicional para sumar. Casos completamente ejecutados: 53/55. Siete incidencias agrupan nueve casos. La regresión auxiliar ejecutada en este trabajo produjo 527 aprobadas, 45 omitidas y 0 fallos de 572 pruebas; sus 45 suites/casos omitidos no equivalen a aprobaciones y no se agregan a la matriz. Evidencia: piloto/regresion.log.

## Entorno y protección de datos

Windows; Node v24.18.0; MariaDB 10.4.32 en 127.0.0.1:3306; React/Express/mysql2 y Playwright instalados. El instalador valida manifiesto y esquema vacío antes de sembrar datos. Esquema final: `dj_qa_6bbb430a113746c6956d6c16d37b8cbc`; detalle de tablas, claves, triggers y rutinas en ambiente.json. Cada ciclo preparatorio usó otro esquema aleatorio conservado, sin reutilizar la base habitual. Solo fixtures ficticios (@example.invalid, nombres QA). No se ejecutaron DROP/DELETE en la base habitual ni se eliminó ningún esquema QA.

Node y npm.cmd disponibles. npm.ps1 queda restringido por PowerShell; se usó npm.cmd para comprobar versión. Python no está en PATH; no fue necesario. No faltaron dependencias para API/UI/Excel. No se usaron Jest/Supertest/Newman porque node:test, assert, fetch y Playwright cubrieron estas comprobaciones. No se detuvo MariaDB compartido. Las contraseñas/JWT generados no se publican; los cuerpos de login están redactados.

El árbol de trabajo tenía cambios previos y mostró cambios de estado durante la sesión. No hay commit único certificado: procedencia-codigo.json registra HEAD y hashes al preparar la entrega. Para reproducción estricta, conservar esa instantánea y evitar ediciones concurrentes.

## Rutas y contratos contrastados

| Módulo | Rutas | Controladores / middleware | Servicios | Tablas | Frontend |
|---|---|---|---|---|---|
| Autenticación/usuarios | usuariosRoutes.js | usuariosController.js; authMiddleware.js; rolesMiddleware.js | bcrypt/jsonwebtoken; identidad | usuarios, roles | LoginPage, AdministracionPage |
| Categorías | categoriasRoutes.js (solo GET) | categoriasController.js | Consulta db.query | categorias | InventarioPage |
| Productos/inventario | productosRoutes.js; inventarioRoutes.js | productosController.js; inventarioController.js; alertasInventarioController.js | pedidoItemsService; alertas; triggers baseline | productos, categorias, movimientos_inventario, alertas_inventario | InventarioPage, AjusteStockForm |
| Mesas/pedidos | mesasRoutes.js; pedidosRoutes.js | mesasController.js; pedidosController.js; sesionesMesaController.js | sesionesMesaService; pedidoItemsService; participantesService | mesas, sesiones_mesa, pedidos, pedido_items, jugadores | MesasPage, PedidosPage, PedidoForm, PedidoDetalle |
| Pagos/divisiones | pagosRoutes.js; divisionesRoutes.js | pagosController.js; divisionesController.js | liquidacionService; divisionesService; divisionCuotasService | pagos, sesiones_division_cuentas, division_participantes, division_items_detalle | CajaPage, PagoDirectoPedido, DivisionCuenta, PagosGlobal |
| Juegos | juegosRoutes.js | juegosController.js | juegosService; juegosPedidoService; mantenimientoJuegosService | activos_juego, sesiones_juego, pedidos | JuegosPage |
| Clientes | clientesRoutes.js | clientesController.js | historialClientesService; identidadService; auditoriaService | clientes, usuarios, auditoria | ClientesPage |
| Ventas/caja/reportes | ventasRoutes.js; cierresCajaRoutes.js | ventasController.js; cierresCajaController.js | comprobantesService; cierresCajaService; frontend reportesService | comprobantes, comprobante_items, pagos, cierre_pagos, cierres_caja, reportes_generados | CajaPage, ReportesPage, ComprobantePedido |
| Kanban | kanbanRoutes.js | kanbanController.js | Transacción de estados; pedidoItemsService | pedido_items, pedidos, kanban_movimientos | KanbanPage |

Los nombres de rutas/controladores se resuelven bajo backend/src/routes y backend/src/controllers; servicios bajo backend/src/services. El frontend está bajo frontend-app/src. Rutas vigentes: /api/usuarios/registrar, /api/clientes/registrar, /api/mesas/estado/:estado, /api/juegos/activos, /api/kanban/tablero y /api/sesiones-division. La existencia de /api/inventario no implica listado raíz; existencias se consultan por /api/productos. Estas adaptaciones de ruta se documentan sin cambiar los resultados esperados. API de categorías devuelve un envoltorio con arreglo datos. CP-030 verificó estado operativo de línea; estado financiero del pedido se verificó en CP-031. CP-045 interpreta «proyectado» como reporte previsto en el diseño, no pronóstico futuro. CP-047 usa listas de participantes del contrato vigente, incluyendo lista vacía y valores de tipo inválido.

## Incidencias y acciones

### INC-001 — CP-008

Tipo: Brecha funcional. Severidad: Media. Estado: Abierto.

Esperado: El rol se actualiza y el usuario conserva el resto de sus datos.

Obtenido: No existe ruta para editar el rol: HTTP 404  404 !== 200 

Posible causa: usuariosRoutes.js registra alta, lectura y cambio de estado; no registra edición de roles. Administración presenta roles como información.

Acción recomendada y repetición: Definir el permiso y contrato de edición de rol; implementar endpoint autorizado y formulario con validación de rol existente, auditoría y control de sesiones. Repetir CP-008 y CP-009.

Evidencia: ejecucion.json, entradas por caso; fuente backend/src/routes/usuariosRoutes.js; frontend-app/src/pages/AdministracionPage.jsx. Responsable por asignar; no se aplicó corrección.

### INC-002 — CP-010, CP-011, CP-013

Tipo: Brecha funcional. Severidad: Media. Estado: Abierto.

Esperado: La categoría se crea y se muestra en el listado. / El sistema rechaza ambos intentos con mensajes claros y no crea registros nuevos. / El nombre se actualiza y los productos asociados mantienen su relación.

Obtenido: Creación de categoría no implementada: HTTP 404  404 !== 201  / Ruta inexistente devuelve 404/404; no valida nombre vacío ni duplicado. / Actualización de categoría no implementada: HTTP 404  404 !== 200 

Posible causa: categoriasRoutes.js expone solo GET y categoriasController.js solo consulta. POST/PUT responden 404.

Acción recomendada y repetición: Implementar alta y edición de categorías con autorización, nombre obligatorio, normalización y unicidad. Preservar FK de productos. Repetir CP-010/011/012/013/014/016.

Evidencia: ejecucion.json, entradas por caso; fuente backend/src/routes/categoriasRoutes.js; backend/src/controllers/categoriasController.js. Responsable por asignar; no se aplicó corrección.

### INC-003 — CP-026

Tipo: Criterio por acordar. Severidad: Media. Estado: Abierto; pendiente definición funcional.

Esperado: El sistema impide la asignación o exige la acción definida por la regla del negocio.

Obtenido: Segundo pedido sobre mesa ocupada aceptado HTTP 201 sin acción diferenciada; contrato permite varios pedidos por visita, requiere acordar criterio.

Posible causa: crearPedido permite múltiples pedidos en una misma visita; no rechaza mesa ocupada. sesiones-mesa.md documenta reutilización de visita y participante.

Acción recomendada y repetición: Confirmar regla con responsable funcional. Si se admite varios pedidos por visita, actualizar el criterio de CP-026 con la acción permitida; si se prohíbe, validar bajo bloqueo transaccional. Repetir CP-026 y regresión de sesiones de mesa.

Evidencia: ejecucion.json, entradas por caso; fuente backend/src/controllers/pedidosController.js; backend/docs/sesiones-mesa.md. Responsable por asignar; no se aplicó corrección.

### INC-004 — CP-028

Tipo: Criterio por acordar. Severidad: Media. Estado: Abierto; pendiente definición funcional.

Esperado: El sistema rechaza la operación e indica que se requiere al menos un producto.

Obtenido: Se crea cuenta sin productos: HTTP 201, líneas=0. Contrato actual permite apertura vacía; requiere decisión de aceptación.

Posible causa: POST /pedidos abre una cuenta y agrega ítems en una segunda operación. El campo items de la prueba no interviene en crearPedido.

Acción recomendada y repetición: Acordar apertura de cuenta frente a confirmación de pedido. Si se requiere confirmación con productos, diseñar operación atómica o impedir confirmar vacío sin bloquear apertura provisional. Repetir CP-028/027/055.

Evidencia: ejecucion.json, entradas por caso; fuente backend/src/controllers/pedidosController.js; frontend-app/src/components/PedidoForm.jsx. Responsable por asignar; no se aplicó corrección.

### INC-005 — CP-040

Tipo: Defecto confirmado. Severidad: Media. Estado: Abierto.

Esperado: El sistema rechaza la operación e indica los campos con error.

Obtenido: Teléfono alfabético aceptado con HTTP 201 y persistido en clientes.  201 !== 400 

Posible causa: contacto() solo valida email; telefono acepta cualquier texto no vacío hasta 20 caracteres. La API responde 201 y persiste abcdefghij.

Acción recomendada y repetición: Acordar formatos permitidos (local/internacional), validar teléfono en backend y frontend y probar límites. No corregir datos existentes automáticamente. Repetir CP-040, CP-039 y CP-041.

Evidencia: ejecucion.json, entradas por caso; fuente backend/src/controllers/clientesController.js: contacto(). Responsable por asignar; no se aplicó corrección.

### INC-006 — CP-042

Tipo: Criterio por acordar. Severidad: Media. Estado: Abierto; pendiente definición funcional.

Esperado: Se genera una venta con total coherente con el pedido y el pago.

Obtenido: Respuesta 200 con comprobante=null; el pago no genera venta/comprobante automáticamente. Requiere emisión explícita y decisión del criterio de aceptación.

Posible causa: Un pago verificado cierra el pedido, pero GET comprobantePorPedido devuelve comprobante:null y puede_generar:true; POST /ventas/facturar emite explícitamente. Ventas se representa además como ingresos verificados en reportes.

Acción recomendada y repetición: Definir qué constituye venta y si la emisión debe ser automática. Si se exige automática, implementar emisión idempotente dentro del flujo acordado. Si es explícita, ajustar criterio y probar facturar. Repetir CP-042/043/045/055.

Evidencia: ejecucion.json, entradas por caso; fuente backend/src/services/comprobantesService.js; backend/src/controllers/pagosController.js; frontend-app/src/services/reportesService.js. Responsable por asignar; no se aplicó corrección.

### INC-007 — CP-054

Tipo: Defecto confirmado. Severidad: Media. Estado: Abierto.

Esperado: Los elementos se reorganizan sin pérdida de contenido ni desbordamientos que impidan operar.

Obtenido: Desbordamiento horizontal detectado: [{"name":"movil","route":"/dashboard","width":390,"scroll":548},{"name":"movil","route":"/operacion/mesas","width":390,"scroll":548},{"name":"movil","route":"/operacion/pedidos","width":390,"scroll":548},{"name":"movil","route":"/inventario","width":390,"scroll":548},{"name":"movil","route":"/juegos","width":390,"scroll":548},{"name":"movil","route":"/caja","width":390,"scroll":548},{"name":"movil","route":"/clientes","width":390,"scroll":548},{"name":"movil","route":"/reportes","width":390,"scroll":548},{"name":"movil","route":"/administracion","width":390,"scroll":548}]  9 !== 0 

Posible causa: Probable ancho fijo del sidebar y margen de admin-main en breakpoint <=700px; contenido mínimo excede el área restante. Debe confirmarse elemento responsable con inspector.

Acción recomendada y repetición: Revisar menú móvil colapsable, anchos mínimos y tablas con scroll local. Repetir CP-054 en 1440x1000, 768x1024 y 390x844 y operar controles de pedidos, pagos e inventario.

Evidencia: ejecucion.json, entradas por caso; fuente frontend-app/src/layouts/AdminLayout/AdminLayout.css: media max-width 700px. Responsable por asignar; no se aplicó corrección.

## Bloqueos y condiciones para completarlos

- CP-043: El sistema registra ingresos mediante pagos verificados y comprobantes, no expone GET /ventas. Falta acordar equivalencia entre venta y pago, y ejecutar dos rangos sobre el contrato aceptado.
- CP-052: Conexión API–MariaDB activa verificada. No se detuvo el servicio compartido; falta instancia exclusiva para comprobar caída y recuperación sin afectar otras aplicaciones.

CP-043 no se marcó aprobado por sustituir venta por pago. Puede ejecutarse al acordar la representación de venta y cargar registros en distintos días, probar rango con y sin datos y conciliar SQL. CP-052 requiere un servidor de base de datos exclusivo para simular caída y recuperación. No se infiere un error funcional de esos bloqueos.

## Revisión de incidencias conocidas

No se proporcionó un registro histórico con IDs, pasos y versiones de cada error. Se contrastaron backend/docs/estado-v1.md, pagos-division-fase8d.md, juegos-pedido-directo.http, sesiones-mesa.md y errores-backend-v1.md como antecedentes; sus afirmaciones históricas no se cuentan como ejecución actual.

| Área | Comprobación actual | Estado prudente |
|---|---|---|
| Pagos | CP-031/032/033/034: importe, FK, pago pendiente→verificado, cierre; CP-048/049: cuotas y cierre | No se reprodujo fallo en estos escenarios; no implica cierre de incidentes históricos sin ID |
| Sesiones de juego | CP-036/037/038: fecha inicio/fin, activo ocupado/disponible, segundo inicio 409, enlace directo a pedido sin item ficticio | Flujo verificado actualmente |
| Selección de productos | CP-014/017/018/027 y CP-055: catálogo, selección real, dos productos, total, UI y SQL | Flujo básico verificado; sin afirmar cobertura de toda condición concurrente |
| Movimientos de inventario | CP-020/021/022/023 y QA-STOCK en ejecucion.json: incremento exacto, rechazo, alerta, conciliación y una salida por pedido | No se reproduce doble descuento en pedidos/pagos/juegos de esta ejecución |
| JSON y errores | CP-053: JSON malformado 400 y siguiente GET 200 | Manejo actual verificado; caída de BD aún bloqueada CP-052 |

El caso adicional QA-STOCK no aumenta el denominador 55. No se marcó ninguna incidencia recién detectada como corregida o cerrada.

## Repetibilidad y evidencias

Ejecutar desde la raíz con Node instalado y dependencias existentes: `node outputs/qa-20261018/ejecutar.cjs` y luego `node outputs/qa-20261018/complementarias.cjs`. La segunda fase usa el último esquema QA registrado, inicia servidores locales propios y token de fixture; el login real se acredita en CP-001. Los scripts se conservan como evidencia del procedimiento. Los datos iniciales son deterministas y cada ciclo principal crea un esquema nuevo. No incluir credenciales reales en reportes.

La ejecución incluye fases preparatorias conservadas en piloto/ y segunda-ejecucion/. Los errores de selector/datos del arnés se corrigieron sin tocar producto y se repitieron; no figuran como defectos de la aplicación. El resultado consolidado es ejecucion.json; retests conserva resultados sustituidos. Los puertos de la fase principal están en ambiente.json; las fases complementarias usan otros puertos libres.

- Matriz Excel y matriz-ejecucion.csv: los 55 resultados y trazabilidad.
- incidencias.csv: esperado, obtenido, causa, severidad y recomendación.
- acciones-correctivas.csv: acciones y estado; responsable por asignar.
- ejecucion.json: solicitudes/respuestas HTTP redactadas, consultas SQL y aserciones por CP.
- CP-*.png: capturas de UI; CP-054 contiene 27 combinaciones de pantalla/resolución.
- piloto/regresion.log: regresión auxiliar real. ambiente.json y procedencia-codigo.json: entorno/procedencia.

Para cerrar la evidencia SENA: acordar las tres discrepancias de alcance, corregir brechas/defectos con autorización, completar los dos bloqueados y repetir casos afectados y flujo CP-055.
