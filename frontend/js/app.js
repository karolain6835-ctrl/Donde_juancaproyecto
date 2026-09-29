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
/// ========================================
// GESTIÓN DE MESAS
// ========================================

const mesas = document.querySelectorAll(".mesa-card");
const mesaDetail = document.getElementById("mesaDetail");

if (mesas.length > 0 && mesaDetail) {

    const contadorLibres =
        document.getElementById("contadorLibres");

    const contadorOcupadas =
        document.getElementById("contadorOcupadas");

    const contadorReservadas =
        document.getElementById("contadorReservadas");

    const contadorLimpieza =
        document.getElementById("contadorLimpieza");


    function aplicarClaseEstado(mesa, estado) {

        mesa.classList.remove(
            "available",
            "occupied",
            "reserved",
            "cleaning"
        );

        if (estado === "Libre") {
            mesa.classList.add("available");
        }

        if (estado === "Ocupada") {
            mesa.classList.add("occupied");
        }

        if (estado === "Reservada") {
            mesa.classList.add("reserved");
        }

        if (estado === "Limpieza") {
            mesa.classList.add("cleaning");
        }
    }


    function actualizarContadoresMesas() {

        let libres = 0;
        let ocupadas = 0;
        let reservadas = 0;
        let limpieza = 0;

        mesas.forEach(function (mesa) {

            const estado = mesa.dataset.estado;

            if (estado === "Libre") {
                libres++;
            }

            if (estado === "Ocupada") {
                ocupadas++;
            }

            if (estado === "Reservada") {
                reservadas++;
            }

            if (estado === "Limpieza") {
                limpieza++;
            }
        });

        if (contadorLibres) {
            contadorLibres.textContent = libres;
        }

        if (contadorOcupadas) {
            contadorOcupadas.textContent = ocupadas;
        }

        if (contadorReservadas) {
            contadorReservadas.textContent = reservadas;
        }

        if (contadorLimpieza) {
            contadorLimpieza.textContent = limpieza;
        }
    }


    // Restaurar estados guardados al cargar la página
    mesas.forEach(function (mesa) {

        const numero = mesa.dataset.numero;

        const estadoGuardado =
            localStorage.getItem("estadoMesa_" + numero);

        if (estadoGuardado) {

            mesa.dataset.estado = estadoGuardado;

            const textoEstado =
                mesa.querySelector("span");

            if (textoEstado) {
                textoEstado.textContent = estadoGuardado;
            }

            aplicarClaseEstado(
                mesa,
                estadoGuardado
            );
        }
    });


    actualizarContadoresMesas();


    mesas.forEach(function (mesa) {

        mesa.addEventListener("click", function () {

            const numero = mesa.dataset.numero;
            const estado = mesa.dataset.estado;
            const capacidad = mesa.dataset.capacidad;

            let botonAccion = "";

            if (estado === "Libre") {

                botonAccion = `
                    <button
                        class="btn-primary"
                        id="crearPedidoMesa"
                    >
                        Crear pedido
                    </button>
                `;

            } else if (estado === "Ocupada") {

                botonAccion = `
                    <button
                        class="btn-secondary"
                        id="verPedidosMesa"
                    >
                        Ver pedidos de la mesa
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

                <div class="form-group mesa-status-form">

                    <label for="nuevoEstadoMesa">
                        Cambiar estado
                    </label>

                    <select id="nuevoEstadoMesa">

                        <option
                            value="Libre"
                            ${estado === "Libre" ? "selected" : ""}
                        >
                            Libre
                        </option>

                        <option
                            value="Ocupada"
                            ${estado === "Ocupada" ? "selected" : ""}
                        >
                            Ocupada
                        </option>

                        <option
                            value="Reservada"
                            ${estado === "Reservada" ? "selected" : ""}
                        >
                            Reservada
                        </option>

                        <option
                            value="Limpieza"
                            ${estado === "Limpieza" ? "selected" : ""}
                        >
                            Limpieza
                        </option>

                    </select>

                    <button
                        class="btn-secondary"
                        id="actualizarEstadoMesa"
                    >
                        Actualizar estado
                    </button>

                </div>
            `;


            // Crear pedido desde una mesa libre
            const crearPedidoMesa =
                document.getElementById("crearPedidoMesa");

            if (crearPedidoMesa) {

                crearPedidoMesa.addEventListener(
                    "click",
                    function () {

                        localStorage.setItem(
                            "mesaSeleccionada",
                            numero
                        );

                        window.location.href =
                            "pedidos.html";
                    }
                );
            }


            // Ver pedidos desde una mesa ocupada
            const verPedidosMesa =
                document.getElementById("verPedidosMesa");

            if (verPedidosMesa) {

                verPedidosMesa.addEventListener(
                    "click",
                    function () {

                        localStorage.setItem(
                            "mesaSeleccionada",
                            numero
                        );

                        window.location.href =
                            "pedidos.html";
                    }
                );
            }


            // Cambiar estado de la mesa
            const actualizarEstadoMesa =
                document.getElementById(
                    "actualizarEstadoMesa"
                );

            if (actualizarEstadoMesa) {

                actualizarEstadoMesa.addEventListener(
                    "click",
                    function () {

                        const selectEstado =
                            document.getElementById(
                                "nuevoEstadoMesa"
                            );

                        const nuevoEstado =
                            selectEstado.value;

                        mesa.dataset.estado =
                            nuevoEstado;

                        localStorage.setItem(
                            "estadoMesa_" + numero,
                            nuevoEstado
                        );

                        const textoEstado =
                            mesa.querySelector("span");

                        if (textoEstado) {
                            textoEstado.textContent =
                                nuevoEstado;
                        }

                        aplicarClaseEstado(
                            mesa,
                            nuevoEstado
                        );

                        actualizarContadoresMesas();

                        mesa.click();
                    }
                );
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

function agregarPedidoATabla(pedido) {

    if (!pedidosTableBody) {
        return;
    }

    const nuevaFila =
        document.createElement("tr");

    const totalFormateado =
        Number(pedido.total).toLocaleString("es-CO");

    nuevaFila.innerHTML = `
        <td>${pedido.id}</td>
        <td>Mesa ${pedido.mesa}</td>
        <td>${pedido.personas}</td>
        <td>$${totalFormateado}</td>
        <td>
            <span class="status-badge status-active">
                ${pedido.estado}
            </span>
        </td>
    `;

    pedidosTableBody.appendChild(nuevaFila);
}
if (pedidosTableBody) {

    const pedidosGuardados =
        JSON.parse(localStorage.getItem("pedidos")) || [];

    pedidosGuardados.forEach(function (pedido) {
        agregarPedidoATabla(pedido);
    });
}
const totalPedidoVista =
    document.getElementById("totalPedido");

const checksProductos =
    document.querySelectorAll(
        'input[name="producto"]'
    );

function actualizarTotalPedido() {

    let total = 0;

    checksProductos.forEach(function (producto) {

        if (producto.checked) {

            total += Number(
                producto.dataset.precio
            );
        }
    });

    if (totalPedidoVista) {

        totalPedidoVista.textContent =
            "$" + total.toLocaleString("es-CO");
    }
}

checksProductos.forEach(function (producto) {

    producto.addEventListener(
        "change",
        actualizarTotalPedido
    );
});
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

       const preciosProductos = {
    "Poker 330ml": 4500,
    "Águila 330ml": 4500,
    "Club Colombia": 7000
};

let totalPedido = 0;
const productosPedido = [];

productosSeleccionados.forEach(function (producto) {
    productosPedido.push(producto.value);

    if (preciosProductos[producto.value]) {
        totalPedido += preciosProductos[producto.value];
    }
});

const numeroPedido =
    "P-" + Math.floor(1000 + Math.random() * 9000);

const nuevoPedido = {
    id: numeroPedido,
    mesa: mesa,
    personas: personas,
    productos: productosPedido,
    total: totalPedido,
    estado: "Activo"
};

const pedidosGuardados =
    JSON.parse(localStorage.getItem("pedidos")) || [];

pedidosGuardados.push(nuevoPedido);

localStorage.setItem(
    "pedidos",
    JSON.stringify(pedidosGuardados)
);

agregarPedidoATabla(nuevoPedido);

pedidoForm.reset();

cerrarModalPedido();
    });
}
// ========================================
// GESTIÓN DE PRODUCTOS
// ========================================

const btnNuevoProducto =
    document.getElementById("btnNuevoProducto");

const productoModal =
    document.getElementById("productoModal");

const cerrarProductoModal =
    document.getElementById("cerrarProductoModal");

const cancelarProducto =
    document.getElementById("cancelarProducto");

const productoForm =
    document.getElementById("productoForm");

const nombreProducto =
    document.getElementById("nombreProducto");

const categoriaProducto =
    document.getElementById("categoriaProducto");

const unidadProducto =
    document.getElementById("unidadProducto");

const precioProducto =
    document.getElementById("precioProducto");

const productoError =
    document.getElementById("productoError");

const productosTableBody =
    document.getElementById("productosTableBody");

const filtrosProducto =
    document.querySelectorAll(".filter-btn");


// ========================================
// ABRIR Y CERRAR MODAL
// ========================================

function abrirProductoModal() {
    if (productoModal) {
        productoModal.classList.add("show");
    }
}

function cerrarModalProducto() {
    if (productoModal) {
        productoModal.classList.remove("show");
    }
}

if (btnNuevoProducto) {
    btnNuevoProducto.addEventListener(
        "click",
        abrirProductoModal
    );
}

if (cerrarProductoModal) {
    cerrarProductoModal.addEventListener(
        "click",
        cerrarModalProducto
    );
}

if (cancelarProducto) {
    cancelarProducto.addEventListener(
        "click",
        cerrarModalProducto
    );
}


// ========================================
// FILTRAR PRODUCTOS
// ========================================

if (filtrosProducto.length > 0) {

    filtrosProducto.forEach(function (boton) {

        boton.addEventListener("click", function () {

            filtrosProducto.forEach(function (item) {
                item.classList.remove("active");
            });

            boton.classList.add("active");

            const categoriaSeleccionada =
                boton.dataset.categoria;

            const filas =
                productosTableBody.querySelectorAll("tr");

            filas.forEach(function (fila) {

                const categoriaFila =
                    fila.dataset.categoria;

                if (
                    categoriaSeleccionada === "Todos" ||
                    categoriaFila === categoriaSeleccionada
                ) {
                    fila.style.display = "";
                } else {
                    fila.style.display = "none";
                }
            });
        });
    });
}


// ========================================
// CREAR PRODUCTO
// ========================================

if (productoForm) {

    productoForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const nombre =
                nombreProducto.value.trim();

            const categoria =
                categoriaProducto.value;

            const unidad =
                unidadProducto.value;

            const precio =
                precioProducto.value;

            if (
                nombre === "" ||
                categoria === "" ||
                unidad === "" ||
                precio === ""
            ) {
                productoError.textContent =
                    "Todos los campos son obligatorios.";
                return;
            }

            if (Number(precio) <= 0) {
                productoError.textContent =
                    "El precio debe ser mayor que cero.";
                return;
            }

            productoError.textContent = "";

            const nuevaFila =
                document.createElement("tr");

            nuevaFila.dataset.categoria =
                categoria;

            const precioFormateado =
                Number(precio).toLocaleString(
                    "es-CO"
                );

            nuevaFila.innerHTML = `
                <td>${nombre}</td>
                <td>${categoria}</td>
                <td>${unidad}</td>
                <td>$${precioFormateado}</td>
                <td>
                    <span class="status-badge status-available">
                        Disponible
                    </span>
                </td>
            `;

            productosTableBody.appendChild(
                nuevaFila
            );

            productoForm.reset();

            cerrarModalProducto();
        }
    );
}
// ========================================
// GESTIÓN DE INVENTARIO
// ========================================

const botonesStock =
    document.querySelectorAll(".btn-stock");

const stockModal =
    document.getElementById("stockModal");

const cerrarStockModal =
    document.getElementById("cerrarStockModal");

const cancelarStock =
    document.getElementById("cancelarStock");

const stockForm =
    document.getElementById("stockForm");

const stockProductoNombre =
    document.getElementById("stockProductoNombre");

const stockProductoActual =
    document.getElementById("stockProductoActual");

const cantidadStock =
    document.getElementById("cantidadStock");

const stockError =
    document.getElementById("stockError");

let botonStockActivo = null;


// ========================================
// ABRIR MODAL DE REPOSICIÓN
// ========================================

if (botonesStock.length > 0) {

    botonesStock.forEach(function (boton) {

        boton.addEventListener("click", function () {

            botonStockActivo = boton;

            const producto =
                boton.dataset.producto;

            const stock =
                boton
                    .closest("tr")
                    .querySelector(".stock-actual")
                    .textContent;

            stockProductoNombre.textContent =
                producto;

            stockProductoActual.textContent =
                stock + " unidades";

            cantidadStock.value = "";
            stockError.textContent = "";

            stockModal.classList.add("show");
        });
    });
}


// ========================================
// CERRAR MODAL
// ========================================

function cerrarModalStock() {

    if (stockModal) {
        stockModal.classList.remove("show");
    }

    botonStockActivo = null;
}

if (cerrarStockModal) {
    cerrarStockModal.addEventListener(
        "click",
        cerrarModalStock
    );
}

if (cancelarStock) {
    cancelarStock.addEventListener(
        "click",
        cerrarModalStock
    );
}


// ========================================
// ACTUALIZAR STOCK
// ========================================

if (stockForm) {

    stockForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const cantidad =
                Number(cantidadStock.value);

            if (
                cantidadStock.value === "" ||
                cantidad <= 0
            ) {
                stockError.textContent =
                    "Ingresa una cantidad válida.";
                return;
            }

            if (!botonStockActivo) {
                return;
            }

            const fila =
                botonStockActivo.closest("tr");

            const celdaStock =
                fila.querySelector(".stock-actual");

            const stockActual =
                Number(celdaStock.textContent);

            const stockMinimo =
                Number(fila.children[2].textContent);

            const nuevoStock =
                stockActual + cantidad;

            celdaStock.textContent =
                nuevoStock;

            const estado =
                fila.querySelector(".status-badge");

            estado.classList.remove(
                "stock-critical",
                "stock-low",
                "stock-normal"
            );

            if (nuevoStock < stockMinimo / 2) {

                estado.textContent = "Crítico";
                estado.classList.add(
                    "stock-critical"
                );

            } else if (nuevoStock < stockMinimo) {

                estado.textContent = "Bajo";
                estado.classList.add(
                    "stock-low"
                );

            } else {

                estado.textContent = "Normal";
                estado.classList.add(
                    "stock-normal"
                );
            }

            cerrarModalStock();
        }
    );
}