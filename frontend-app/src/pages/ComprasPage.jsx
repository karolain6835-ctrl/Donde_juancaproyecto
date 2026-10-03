import { useMemo, useState } from "react";
import "./ComprasPage.css";

function ComprasPage() {
  const [seccionActiva, setSeccionActiva] = useState("ordenes");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);

  const [ordenes, setOrdenes] = useState([
    {
      id: "OC-209",
      proveedor: "Bavaria",
      fecha: "02/10/2026",
      total: 480000,
      estado: "pendiente",
      productos: 3,
      responsable: "Karol",
      detalle: [
        {
          producto: "Poker 330ml",
          cantidad: 48,
          precioUnitario: 2500,
        },
        {
          producto: "Club Colombia",
          cantidad: 24,
          precioUnitario: 3100,
        },
        {
          producto: "Coca-Cola 400ml",
          cantidad: 36,
          precioUnitario: 2100,
        },
      ],
    },
    {
      id: "OC-208",
      proveedor: "Dislicores Medellín",
      fecha: "01/10/2026",
      total: 720000,
      estado: "recibida",
      productos: 2,
      responsable: "Karol",
      detalle: [
        {
          producto: "Aguardiente Antioqueño",
          cantidad: 12,
          precioUnitario: 42000,
        },
        {
          producto: "Ron Medellín 750ml",
          cantidad: 6,
          precioUnitario: 48000,
        },
      ],
    },
    {
      id: "OC-207",
      proveedor: "Distribuciones El Bar",
      fecha: "30/09/2026",
      total: 185000,
      estado: "cancelada",
      productos: 2,
      responsable: "Carlos",
      detalle: [
        {
          producto: "Snacks surtidos",
          cantidad: 20,
          precioUnitario: 4500,
        },
        {
          producto: "Hielo",
          cantidad: 10,
          precioUnitario: 9500,
        },
      ],
    },
    {
      id: "OC-206",
      proveedor: "Bavaria",
      fecha: "29/09/2026",
      total: 355000,
      estado: "recibida",
      productos: 2,
      responsable: "Karol",
      detalle: [
        {
          producto: "Poker 330ml",
          cantidad: 60,
          precioUnitario: 2500,
        },
        {
          producto: "Club Colombia",
          cantidad: 30,
          precioUnitario: 3100,
        },
      ],
    },
  ]);

  const [proveedores, setProveedores] = useState([
    {
      id: 1,
      nombre: "Bavaria",
      contacto: "Andrés Gómez",
      telefono: "300 555 1420",
      email: "ventas@bavaria.com",
      activo: true,
    },
    {
      id: 2,
      nombre: "Dislicores Medellín",
      contacto: "María Pérez",
      telefono: "301 448 2366",
      email: "pedidos@dislicores.com",
      activo: true,
    },
    {
      id: 3,
      nombre: "Distribuciones El Bar",
      contacto: "Carlos Ruiz",
      telefono: "312 770 1845",
      email: "ventas@elbar.com",
      activo: false,
    },
  ]);

  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((orden) => {
      const coincideEstado =
        filtroEstado === "todas" || orden.estado === filtroEstado;

      const texto = busqueda.toLowerCase();

      const coincideBusqueda =
        orden.id.toLowerCase().includes(texto) ||
        orden.proveedor.toLowerCase().includes(texto) ||
        orden.responsable.toLowerCase().includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [ordenes, filtroEstado, busqueda]);

  const proveedoresFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return proveedores.filter(
      (proveedor) =>
        proveedor.nombre.toLowerCase().includes(texto) ||
        proveedor.contacto.toLowerCase().includes(texto) ||
        proveedor.email.toLowerCase().includes(texto)
    );
  }, [proveedores, busqueda]);

  const pendientes = ordenes.filter(
    (orden) => orden.estado === "pendiente"
  ).length;

  const recibidas = ordenes.filter(
    (orden) => orden.estado === "recibida"
  ).length;

  const canceladas = ordenes.filter(
    (orden) => orden.estado === "cancelada"
  ).length;

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function nombreEstado(estado) {
    if (estado === "pendiente") return "Pendiente";
    if (estado === "recibida") return "Recibida";
    if (estado === "cancelada") return "Cancelada";
    return estado;
  }

  function cambiarEstadoOrden(nuevoEstado) {
    if (!ordenSeleccionada) return;

    setOrdenes((actuales) =>
      actuales.map((orden) =>
        orden.id === ordenSeleccionada.id
          ? { ...orden, estado: nuevoEstado }
          : orden
      )
    );

    setOrdenSeleccionada((actual) =>
      actual ? { ...actual, estado: nuevoEstado } : null
    );
  }

  function cambiarEstadoProveedor(id) {
    setProveedores((actuales) =>
      actuales.map((proveedor) =>
        proveedor.id === id
          ? { ...proveedor, activo: !proveedor.activo }
          : proveedor
      )
    );

    setProveedorSeleccionado((actual) =>
      actual && actual.id === id
        ? { ...actual, activo: !actual.activo }
        : actual
    );
  }

  return (
    <div className="compras-page">

      <header className="compras-header">
        <div>
          <p className="page-eyebrow">COMPRAS</p>

          <h1 className="page-title">
            {seccionActiva === "ordenes"
              ? "Órdenes de compra"
              : "Proveedores"}
          </h1>

          <p className="page-description">
            {seccionActiva === "ordenes"
              ? "Gestiona compras y recepción de mercancía."
              : "Administra proveedores y consulta su historial de compras."}
          </p>
        </div>

        <button className="primary-button">
          {seccionActiva === "ordenes"
            ? "+ Nueva compra"
            : "+ Nuevo proveedor"}
        </button>
      </header>

      <nav className="compras-nav">
        <button
          className={seccionActiva === "ordenes" ? "active" : ""}
          onClick={() => {
            setSeccionActiva("ordenes");
            setBusqueda("");
          }}
        >
          Órdenes
        </button>

        <button
          className={seccionActiva === "proveedores" ? "active" : ""}
          onClick={() => {
            setSeccionActiva("proveedores");
            setBusqueda("");
          }}
        >
          Proveedores
        </button>
      </nav>

      {seccionActiva === "ordenes" && (
        <>
          <section className="compras-kpis">

            <button
              className={`compra-kpi ${
                filtroEstado === "todas" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("todas")}
            >
              <span>Total órdenes</span>
              <strong>{ordenes.length}</strong>
              <small>Órdenes registradas</small>
            </button>

            <button
              className={`compra-kpi ${
                filtroEstado === "pendiente" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("pendiente")}
            >
              <span>Pendientes</span>
              <strong>{pendientes}</strong>
              <small>Por recibir</small>
            </button>

            <button
              className={`compra-kpi ${
                filtroEstado === "recibida" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("recibida")}
            >
              <span>Recibidas</span>
              <strong>{recibidas}</strong>
              <small>Ingresadas a inventario</small>
            </button>

            <button
              className={`compra-kpi alert ${
                filtroEstado === "cancelada" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("cancelada")}
            >
              <span>Canceladas</span>
              <strong>{canceladas}</strong>
              <small>No procesadas</small>
            </button>

          </section>

          <section className="compras-toolbar">

            <div className="compras-filters">
              {["todas", "pendiente", "recibida", "cancelada"].map(
                (estado) => (
                  <button
                    key={estado}
                    className={`filter-button ${
                      filtroEstado === estado ? "active" : ""
                    }`}
                    onClick={() => setFiltroEstado(estado)}
                  >
                    {estado === "todas"
                      ? "Todas"
                      : nombreEstado(estado)}
                  </button>
                )
              )}
            </div>

            <div className="compras-search">
              <input
                type="text"
                placeholder="Buscar orden o proveedor..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </div>

          </section>

          <section className="compras-panel">

            <div className="compras-panel-header">
              <div>
                <h2>Historial de órdenes</h2>
                <p>
                  {ordenesFiltradas.length} órdenes encontradas
                </p>
              </div>
            </div>

            <div className="compras-table-wrapper">
              <table className="compras-table">

                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Proveedor</th>
                    <th>Fecha</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Responsable</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {ordenesFiltradas.map((orden) => (
                    <tr key={orden.id}>
                      <td><strong>{orden.id}</strong></td>
                      <td>{orden.proveedor}</td>
                      <td>{orden.fecha}</td>
                      <td>{orden.productos}</td>
                      <td>
                        <strong>{formatearDinero(orden.total)}</strong>
                      </td>
                      <td>{orden.responsable}</td>

                      <td>
                        <span className={`compra-status ${orden.estado}`}>
                          {nombreEstado(orden.estado)}
                        </span>
                      </td>

                      <td>
                        <button
                          className="compra-detail-button"
                          onClick={() => setOrdenSeleccionada(orden)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

          </section>
        </>
      )}

      {seccionActiva === "proveedores" && (
        <>
          <section className="compras-toolbar">

            <div className="proveedores-summary">
              <span>
                {proveedores.filter((p) => p.activo).length} activos
              </span>

              <span>
                {proveedores.filter((p) => !p.activo).length} inactivos
              </span>
            </div>

            <div className="compras-search">
              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </div>

          </section>

          <section className="proveedores-grid">

            {proveedoresFiltrados.map((proveedor) => (
              <article
                key={proveedor.id}
                className="proveedor-card"
              >

                <div className="proveedor-card-header">
                  <div>
                    <h3>{proveedor.nombre}</h3>

                    <span
                      className={`proveedor-status ${
                        proveedor.activo ? "activo" : "inactivo"
                      }`}
                    >
                      {proveedor.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>

                <div className="proveedor-info">
                  <span>Contacto</span>
                  <strong>{proveedor.contacto}</strong>
                </div>

                <div className="proveedor-info">
                  <span>Teléfono</span>
                  <strong>{proveedor.telefono}</strong>
                </div>

                <div className="proveedor-info">
                  <span>Correo</span>
                  <strong>{proveedor.email}</strong>
                </div>

                <div className="proveedor-card-footer">

                  <button
                    className="compra-detail-button"
                    onClick={() =>
                      setProveedorSeleccionado(proveedor)
                    }
                  >
                    Ver detalle
                  </button>

                  <button
                    className="proveedor-toggle-button"
                    onClick={() =>
                      cambiarEstadoProveedor(proveedor.id)
                    }
                  >
                    {proveedor.activo
                      ? "Desactivar"
                      : "Activar"}
                  </button>

                </div>

              </article>
            ))}

          </section>
        </>
      )}

      {ordenSeleccionada && (
        <>
          <div
            className="compra-overlay"
            onClick={() => setOrdenSeleccionada(null)}
          ></div>

          <aside className="compra-drawer">

            <div className="compra-drawer-header">
              <div>
                <p className="page-eyebrow">
                  ORDEN DE COMPRA
                </p>

                <h2>{ordenSeleccionada.id}</h2>
              </div>

              <button
                className="drawer-close"
                onClick={() => setOrdenSeleccionada(null)}
              >
                ×
              </button>
            </div>

            <div className="compra-drawer-status">
              <span>Estado</span>
              <strong>
                {nombreEstado(ordenSeleccionada.estado)}
              </strong>
            </div>

            <div className="compra-detail-grid">

              <div>
                <span>Proveedor</span>
                <strong>{ordenSeleccionada.proveedor}</strong>
              </div>

              <div>
                <span>Fecha</span>
                <strong>{ordenSeleccionada.fecha}</strong>
              </div>

              <div>
                <span>Responsable</span>
                <strong>{ordenSeleccionada.responsable}</strong>
              </div>

              <div>
                <span>Productos</span>
                <strong>{ordenSeleccionada.productos}</strong>
              </div>

            </div>

            <div className="compra-products">
              <h3>Productos de la orden</h3>

              {ordenSeleccionada.detalle.map((item, index) => (
                <div
                  key={index}
                  className="compra-product-row"
                >
                  <div>
                    <strong>{item.producto}</strong>

                    <span>
                      {item.cantidad} ×{" "}
                      {formatearDinero(item.precioUnitario)}
                    </span>
                  </div>

                  <strong>
                    {formatearDinero(
                      item.cantidad * item.precioUnitario
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <div className="compra-total">
              <span>Total orden</span>
              <strong>
                {formatearDinero(ordenSeleccionada.total)}
              </strong>
            </div>

            {ordenSeleccionada.estado === "pendiente" && (
              <div className="compra-actions">

                <button
                  className="drawer-primary-button"
                  onClick={() => cambiarEstadoOrden("recibida")}
                >
                  Recibir compra
                </button>

                <button
                  className="drawer-secondary-button"
                  onClick={() => cambiarEstadoOrden("cancelada")}
                >
                  Cancelar orden
                </button>

              </div>
            )}

          </aside>
        </>
      )}

      {proveedorSeleccionado && (
        <>
          <div
            className="compra-overlay"
            onClick={() => setProveedorSeleccionado(null)}
          ></div>

          <aside className="compra-drawer">

            <div className="compra-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DEL PROVEEDOR
                </p>

                <h2>
                  {proveedorSeleccionado.nombre}
                </h2>
              </div>

              <button
                className="drawer-close"
                onClick={() => setProveedorSeleccionado(null)}
              >
                ×
              </button>

            </div>

            <div className="compra-drawer-status">
              <span>Estado</span>

              <strong>
                {proveedorSeleccionado.activo
                  ? "Activo"
                  : "Inactivo"}
              </strong>
            </div>

            <div className="compra-detail-grid">

              <div>
                <span>Contacto</span>
                <strong>
                  {proveedorSeleccionado.contacto}
                </strong>
              </div>

              <div>
                <span>Teléfono</span>
                <strong>
                  {proveedorSeleccionado.telefono}
                </strong>
              </div>

              <div>
                <span>Correo</span>
                <strong>
                  {proveedorSeleccionado.email}
                </strong>
              </div>

              <div>
                <span>Órdenes registradas</span>
                <strong>
                  {
                    ordenes.filter(
                      (orden) =>
                        orden.proveedor ===
                        proveedorSeleccionado.nombre
                    ).length
                  }
                </strong>
              </div>

            </div>

            <div className="proveedor-history">

              <h3>Historial de compras</h3>

              {ordenes
                .filter(
                  (orden) =>
                    orden.proveedor ===
                    proveedorSeleccionado.nombre
                )
                .map((orden) => (
                  <div
                    key={orden.id}
                    className="proveedor-history-row"
                  >
                    <div>
                      <strong>{orden.id}</strong>
                      <span>{orden.fecha}</span>
                    </div>

                    <strong>
                      {formatearDinero(orden.total)}
                    </strong>
                  </div>
                ))}

            </div>

          </aside>
        </>
      )}

    </div>
  );
}

export default ComprasPage;