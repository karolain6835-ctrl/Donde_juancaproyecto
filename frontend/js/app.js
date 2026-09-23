// ========================================
// LOGIN
// ========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    const usuarioInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("password");
    const loginError = document.getElementById("loginError");

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const usuario = usuarioInput.value.trim();
        const password = passwordInput.value.trim();

        if (usuario === "" || password === "") {
            loginError.textContent = "Todos los campos son obligatorios.";
            return;
        }

        if (password.length < 4) {
            loginError.textContent =
                "La contraseña debe tener al menos 4 caracteres.";
            return;
        }

        loginError.textContent = "";

        // Guardamos el usuario para utilizarlo en otras pantallas
        localStorage.setItem("usuarioActivo", usuario);

        // Ir al dashboard
        window.location.href = "dashboard.html";
    });
}


// ========================================
// DASHBOARD
// ========================================

const nombreUsuario = document.getElementById("nombreUsuario");
const saludoUsuario = document.getElementById("saludoUsuario");

const usuarioActivo = localStorage.getItem("usuarioActivo");

if (nombreUsuario && usuarioActivo) {
    nombreUsuario.textContent = usuarioActivo;
}

if (saludoUsuario && usuarioActivo) {
    saludoUsuario.textContent =
        `Bienvenido, ${usuarioActivo}. Este es el resumen general del establecimiento.`;
}
// ========================================
// GESTIÓN DE MESAS
// ========================================

const mesas = document.querySelectorAll(".mesa-card");
const mesaDetail = document.getElementById("mesaDetail");

if (mesas.length > 0 && mesaDetail) {

    mesas.forEach(function (mesa) {

        mesa.addEventListener("click", function () {

            const numero = mesa.dataset.numero;
            const estado = mesa.dataset.estado;
            const capacidad = mesa.dataset.capacidad;

            let botonAccion = "";

            if (estado === "Libre") {
                botonAccion = `
                    <button class="btn-primary" id="crearPedidoMesa">
                        Crear pedido
                    </button>
                `;
            }

            mesaDetail.innerHTML = `
                <h2>Mesa ${numero}</h2>

                <p>
                    <strong>Estado:</strong>
                    ${estado}
                </p>

                <p>
                    <strong>Capacidad:</strong>
                    ${capacidad} personas
                </p>

                ${botonAccion}
            `;

            const crearPedidoMesa =
                document.getElementById("crearPedidoMesa");

            if (crearPedidoMesa) {

                crearPedidoMesa.addEventListener("click", function () {

                    localStorage.setItem(
                        "mesaSeleccionada",
                        numero
                    );

                    window.location.href = "pedidos.html";
                });
            }
        });
    });
}
// ========================================
// GESTIÓN DE PEDIDOS
// ========================================

const pedidoModal = document.getElementById("pedidoModal");
const btnNuevoPedido = document.getElementById("btnNuevoPedido");
const cerrarModal = document.getElementById("cerrarModal");
const cancelarPedido = document.getElementById("cancelarPedido");
const pedidoForm = document.getElementById("pedidoForm");

const mesaPedido = document.getElementById("mesaPedido");
const personasPedido = document.getElementById("personasPedido");
const pedidoError = document.getElementById("pedidoError");

const pedidosTableBody =
    document.getElementById("pedidosTableBody");

function abrirModalPedido() {
    if (pedidoModal) {
        pedidoModal.classList.add("show");
    }
}

function cerrarModalPedido() {
    if (pedidoModal) {
        pedidoModal.classList.remove("show");
    }
}

if (btnNuevoPedido) {
    btnNuevoPedido.addEventListener("click", function () {
        abrirModalPedido();
    });
}

if (cerrarModal) {
    cerrarModal.addEventListener("click", cerrarModalPedido);
}

if (cancelarPedido) {
    cancelarPedido.addEventListener("click", cerrarModalPedido);
}


// ========================================
// MESA RECIBIDA DESDE GESTIÓN DE MESAS
// ========================================

const mesaSeleccionada =
    localStorage.getItem("mesaSeleccionada");

if (mesaPedido && mesaSeleccionada) {

    mesaPedido.value = mesaSeleccionada;

    abrirModalPedido();

    localStorage.removeItem("mesaSeleccionada");
}


// ========================================
// CREAR PEDIDO SIMULADO
// ========================================

if (pedidoForm) {

    pedidoForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const mesa = mesaPedido.value;
        const personas = personasPedido.value;

        const productosSeleccionados =
            document.querySelectorAll(
                'input[name="producto"]:checked'
            );

        if (mesa === "" || personas === "") {
            pedidoError.textContent =
                "Debes seleccionar una mesa e indicar el número de personas.";
            return;
        }

        if (productosSeleccionados.length === 0) {
            pedidoError.textContent =
                "Selecciona al menos un producto.";
            return;
        }

        pedidoError.textContent = "";

        const numeroPedido =
            "P-" + Math.floor(1000 + Math.random() * 9000);

        const nuevaFila = document.createElement("tr");

        nuevaFila.innerHTML = `
            <td>${numeroPedido}</td>
            <td>Mesa ${mesa}</td>
            <td>${personas}</td>
            <td>$0</td>
            <td>
                <span class="status-badge status-active">
                    Activo
                </span>
            </td>
        `;

        pedidosTableBody.appendChild(nuevaFila);

        pedidoForm.reset();

        cerrarModalPedido();
    });
}