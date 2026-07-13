 Estado actual del proyecto
Nos encontramos consolidando la transición entre el Diseño y la Construcción. Tienes el "motor" de datos (MySQL) estructurado en XAMPP
 y estamos preparando el terreno en Visual Studio Code
 para iniciar el código del Backend. La creación del contexto para la IA nos sitúa en un progreso sólido del 36%.
2. Roadmap actualizado
✅ FASE 1 a FASE 4: Análisis, Requisitos, Modelado y Diseño BD. 🟡 FASE 5: Implementación SQL (Base creada, faltan vistas, triggers y datos). 🟡 FASE 6: Backend Node.js (Preparación de entorno y contexto IA). ⬜ FASE 7: API REST. 🟡 FASE 8: Frontend (Maquetación XML de Android lista, falta lógica). ⬜ FASE 9: Seguridad. ⬜ FASE 10: Pruebas. 🟡 FASE 11: Documentación (Creando CONTEXTO_IA.md). ⬜ FASE 12: Despliegue.
3. Lo que ya está terminado
✔ requisitos ✔ casos de uso ✔ historias de usuario ✔ modelo entidad relación ✔ modelo relacional ✔ normalización ✔ diccionario de datos ✔ tablas ✔ restricciones ✔ arquitectura
4. Lo que está en proceso
🟡 backend (estructurando espacio de trabajo) 🟡 documentación (creando CONTEXTO_IA.md)
5. Lo que falta
⬜ índices ⬜ vistas ⬜ procedimientos ⬜ triggers ⬜ datos de prueba ⬜ rutas ⬜ controladores ⬜ modelos ⬜ autenticación ⬜ autorización ⬜ validaciones ⬜ manejo de errores ⬜ pruebas ⬜ despliegue
6. La siguiente tarea recomendada
Crear el archivo CONTEXTO_IA.md en Visual Studio Code.
Abre Visual Studio Code, crea un archivo llamado CONTEXTO_IA.md en la raíz de tu proyecto (o en tu carpeta docs/) y copia y pega exactamente este texto (que he extraído estrictamente de tu documentación técnica y nuestras auditorías
):
# CONTEXTO DEL PROYECTO: DONDE JUANCA

## 1. Descripción General
Sistema de Información para la Gestión Integral de Inventario, Pedidos, Juegos y Ventas del Establecimiento Comercial "Donde Juanca" (venta de licores y juegos tradicionales colombianos como el Tejo y Billar).

## 2. Stack Tecnológico Aprobado
* **Backend:** JavaScript con Node.js y Express.js.
* **Frontend:** HTML5, CSS3, JavaScript, Bootstrap (Web) / XML Android (Móvil).
* **Base de Datos:** MySQL (Motor InnoDB).
* **Entorno:** Visual Studio Code, Git/GitHub, XAMPP (Local).

## 3. Patrón Arquitectónico
Arquitectura en Capas (Rutas, Controladores, Modelos). El sistema opera bajo un modelo Cliente-Servidor con una API REST comunicándose en formato JSON.

## 4. Reglas Críticas de Base de Datos y Negocio (¡ESTRICTAS!)
Como IA asistente, NUNCA debes sugerir código que viole estas Reglas de Decisión Arquitectónica (DA):
* **Sincronización Offline (DA-018):** El sistema DEBE funcionar sin internet. Por lo tanto, TODAS las tablas transaccionales (pedidos, pagos, rondas, etc.) usan `UUID` (VARCHAR 36) como Llaves Primarias (PK). NUNCA uses `INT AUTO_INCREMENT` para transacciones. 
* **Cola de Eventos:** Los eventos generados offline se guardan en la tabla `cola_eventos_offline` y se sincronizan al reconectar.
* **Borrado Lógico (DA-017):** Prohibido usar `DELETE` físico. Toda tabla maestra usa un campo `estado` (ej. activo/inactivo) o `deleted_at` para cumplir la Ley 1581 de protección de datos.
* **Históricos Financieros:** El precio de los productos puede cambiar, por lo que las tablas de detalles (ej. `pedido_items`, `mermas`) congelan el valor al momento de la transacción en campos como `precio_unitario` y `cpp_al_momento`.
* **Seguridad:** Las contraseñas se almacenan como `password_hash` (bcrypt). Hay manejo de inicio de sesión con OTP (Código de un solo uso).
* **Lógica de Juegos (DA-014):** En el Tejo, se registra la ronda y el sistema asigna el consumo de la partida automáticamente a los jugadores de la pareja perdedora.

## 5. Actores del Sistema
* Administrador (Control total, reportes, inventario).
* Encargada de juegos (Asignación de mesas de juego, registro de perdedores).
* Meseras (Toma de pedidos offline/online, cobros).
7. Qué debo aprender antes de hacerla (Momento de Profesor)
¿Qué es Markdown (.md)? Es un lenguaje de marcado súper ligero. Se usa en programación para escribir documentación que sea fácil de leer tanto para humanos como para máquinas. Los numerales # significan títulos, y los asteriscos * crean viñetas
.
Ventana de Contexto de la IA: Las inteligencias artificiales no tienen memoria infinita. Al entregarles este documento primero, establecemos los "límites de su conocimiento". Si no le decimos que usamos UUIDs por nuestro modo offline, la IA generará el backend usando IDs tradicionales, arruinando la sincronización de las meseras
.
8. Errores que debo evitar
Agregar información irrelevante: No incluyas en este archivo temas de metodologías de Scrum o justificaciones de presupuesto. A la IA de programación solo le importan las reglas de negocio, los datos y el stack tecnológico.
Olvidarse de adjuntar este archivo: Cada vez que inicies un nuevo chat con una IA para pedirle que te ayude a programar una ruta o un controlador, lo primero que debes hacer es adjuntarle este CONTEXTO_IA.md.
9. Dependencias de esa tarea
¿Para qué sirve? Para estandarizar el desarrollo y evitar que las herramientas de IA rompan las Reglas de Negocio que definimos en la fase de análisis.
¿Qué debo saber antes? Entender el impacto del stack elegido (Node.js/MySQL)
.
¿Qué depende de esta tarea? Todo el código backend que escribamos de ahora en adelante.
¿Qué tareas futuras dependen de ella? La creación de la API REST (Rutas y Controladores).
10. Cómo comprobar que quedó correctamente implementada
El archivo debe existir en Visual Studio Code con la extensión .md. Si le pasas este archivo a una IA y le pides "Crea el modelo para guardar un pedido", la IA debe devolverte un código en Node.js usando UUID para el ID del pedido, en lugar de un número entero.