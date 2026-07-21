# DondeJuanca
Sistemas de informacion para la gestion integral de inventario, pedidos, juegos y ventas del establecimiento Donde juanca.

## Estado del proyecto

En desarrollo.

## Autora

Karol Julio
# 🎳 Sistema de Gestión "Donde Juanca" & Módulo Ambiental "Viota Verde"
> **Proyecto Integrador de Ingeniería de Software y Análisis y Desarrollo de Software**  
> **Aprendiz / Estudiante:** Karol Lineth Julio Uran  
> **Institución:** ETITC / SENA  
> **Ubicación:** Viotá, Cundinamarca  

---

## 📝 Descripción General del Proyecto
Este repositorio alberga el ecosistema tecnológico desarrollado para el establecimiento comercial **"Donde Juanca"**. El proyecto abarca desde la ingeniería de requisitos, el diseño de la base de datos relacional y el backend de control operativo, hasta el diseño conceptual y de marca de **"Viota Verde"**, un módulo de videojuego educativo estilo pixel art enfocado en la conciencia ambiental y el reciclaje para niños en el municipio de Viotá.

---

## 📅 Historial de Evolución y Componentes del Proyecto

### 🏢 Fase 1: Concepción, Requisitos y Diseño Conceptual (Mayo - Junio 2026)
*   **Diseño de Marca "Viota Verde":** Creación de la identidad visual, logotipos en estilo pixel art y especificaciones de marca para el videojuego educativo ambiental enfocado en la niñez de Viotá, Cundinamarca.
*   **Ingeniería de Requisitos:** Documentación formal de los requisitos funcionales y no funcionales del sistema bajo metodologías ágiles, presentados ante el SENA.
*   **Investigación y Fundamentos:** Desarrollo de entregables de investigación académica en criptología y seguridad informática para el blindaje de datos.

### 📊 Fase 2: Participación en Feria de Innovación (Junio 2026)
*   Exposición y sustentación del proyecto como expositora activa en la **Primera Feria de Proyectos Innovadores de Viotá, Cundinamarca**, validando los componentes del sistema con la comunidad académica.

### 💻 Fase 3: Arquitectura de Software, Sincronización y Base de Datos (Julio 2026)
*   **Configuración del Entorno:** Implementación y sincronización de un entorno de desarrollo distribuido en dos estaciones de trabajo utilizando Spec Kit, Git y GitHub.
*   **Diseño de Base de Datos Física:** Creación del esquema relacional `mydb` en MySQL.
*   **Historial de Migraciones y Scripts Estructurados:**
    *  v1.0_estructura.sql: Creación del esquema físico inicial y las tablas base del sistema.

* `v1.1_semillas.sql:` Inserción de los primeros datos de prueba y registros base para el entorno.

`v1.2_agregar_icono_categorias.sql:` Modificación estructural para añadir el campo de iconos en el módulo de categorías.

`v1.3_modificar_tipo_dato_icono.sql:` Ajuste y optimización del tipo de datos para el manejo de los iconos.

`v1.4_agregar_restriccion_descripcion.sql:` Implementación de restricciones de validación en las descripciones del negocio.

`v1.5_eliminar_restriccion_descripcion.sql:` Corrección y remoción de la restricción previa para flexibilizar el flujo de datos.

`v1.6_definir_politicas_referenciales.sql:` Configuración de las reglas de integridad referencial y llaves foráneas.

`v1.7_actualizar_politicas_update.sql:` Ajuste de las políticas de actualización en cascada de las relaciones.

`v1.8_Asegurar integridad en transacciones.sql:` Implementación de reglas avanzadas para proteger la consistencia de las ventas y operaciones.

`v1.9_gestion_api_mesas_productos.sql:` Preparación y soporte de la base de datos para la API del catálogo de productos y control de mesas.

`v2.0_gestion_api_pagos_cierres.sql:` Estructura para el flujo de caja, transacciones monetarias y cierres de jornada.

`v2.1_gestion_api_juegos.sql:` Soporte para el módulo operativo de tiempos, canchas de tejo y billar.

`v2.2_gestion_alerts_inventario.sql:` Implementación de disparadores o lógica para el control de stock mínimo y alertas de reabastecimiento.

`v2.8_registros_iniciales_parametrizacion.sql:` Carga limpia de datos maestros de roles y activos de juego con la tarifa corregida por hora.

`v2.9_actualizacion_seguridad_usuarios.sql` 
 `v2.10_actualizacion_sesiones_activas.sql:` Scripts de alteración para el endurecimiento y auditoría del módulo de seguridad.
*   `v2.8_registros_iniciales_parametrizacion.sql`: Carga de datos maestros (Configuración de roles de usuario y activos de juego como canchas de tejo y billar con tarifas integradas bajo la columna `precio_hora`).

---

## 🛠️ Stack Tecnológico Utilizado
*   **Backend & Lógica:** Node.js / Express
*   **Base de Datos:** MySQL Workbench / MongoDB (Módulos de consulta rápidos)
*   **Diseño Conceptual:** Aseprite / Herramientas de Pixel Art (Para Viota Verde)
*   **Control de Versiones:** Git / GitHub

---

## 🚀 Instrucciones de Despliegue Local (Base de Datos)

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/TU_USUARIO/TU_REPOSITORIO.git](https://github.com/TU_USUARIO/TU_REPOSITORIO.git)