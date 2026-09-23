# Donde Juanca - Frontend

## Evidencia

**GA6-220501096-AA3-EV03 - Interfaces gráficas según requerimientos del proyecto**

Proyecto desarrollado para el programa de **Análisis y Desarrollo de Software - SENA**.

---

## Descripción

Este proyecto corresponde a la implementación Frontend del sistema de información **Donde Juanca**.

Las interfaces fueron desarrolladas a partir de los mockups y prototipos realizados previamente para el proyecto, transformando los diseños visuales en páginas web funcionales mediante HTML, CSS y JavaScript.

El sistema está orientado a apoyar diferentes procesos administrativos y operativos del establecimiento Donde Juanca.

---

## Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript
- LocalStorage
- Visual Studio Code
- Live Server
- Git
- GitHub

---

## Pantallas implementadas

### Login

Permite simular el inicio de sesión de un usuario.

Incluye:

- Campo de usuario.
- Campo de contraseña.
- Validación de campos obligatorios.
- Validación básica de contraseña.
- Almacenamiento temporal del nombre del usuario mediante LocalStorage.
- Redirección al Dashboard.

### Dashboard

Presenta un resumen general del estado del establecimiento.

Incluye información simulada sobre:

- Ventas del día.
- Pedidos activos.
- Mesas disponibles.
- Alertas de inventario.
- Tabla de pedidos activos.
- Estado general de las mesas.

### Gestión de Mesas

Permite visualizar las mesas disponibles y consultar su estado.

Los estados representados son:

- Libre.
- Ocupada.
- Reservada.
- En limpieza.

Al seleccionar una mesa se muestra información como su número, estado y capacidad.

Cuando una mesa se encuentra disponible, el sistema permite continuar hacia la creación de un nuevo pedido.

### Gestión de Pedidos

Permite visualizar y registrar pedidos mediante una interfaz interactiva.

El formulario incluye:

- Selección de mesa.
- Número de personas.
- Selección de categoría.
- Selección de productos mediante checkboxes.
- Validación de campos.
- Creación simulada de nuevos pedidos.

Los pedidos creados se agregan dinámicamente al listado mediante JavaScript.

---

## Navegación

El sistema permite navegar entre las principales interfaces mediante un menú común.

Flujo principal:

Login → Dashboard → Mesas → Seleccionar mesa → Crear pedido → Pedidos

---

## Diseño Responsive

Las interfaces fueron adaptadas para diferentes tamaños de pantalla utilizando Media Queries en CSS.

El diseño se ajusta para:

- Computadores de escritorio.
- Tablets.
- Dispositivos móviles.

En pantallas pequeñas, el menú lateral cambia su distribución y las tarjetas se reorganizan para facilitar la navegación.

---

## Datos simulados

Para esta etapa del proyecto no se realiza conexión directa con la base de datos MySQL.

Las interfaces utilizan datos simulados con el propósito de desarrollar y comprobar el comportamiento del Frontend sin afectar la base de datos real del sistema.

También se utiliza LocalStorage para almacenar temporalmente información necesaria durante la navegación entre las interfaces.

---

## Estructura del proyecto

```text
frontend/
│
├── index.html
├── dashboard.html
├── mesas.html
├── pedidos.html
│
├── css/
│   ├── style.css
│   ├── components.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   ├── mock/
│   ├── components/
│   └── features/
│
└── assets/
    ├── img/
    └── icons/