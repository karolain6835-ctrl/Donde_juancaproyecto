import { useMemo, useState } from "react";

import {
  Search,
  Plus,
  ShoppingCart,
  Clock3,
  CircleCheck,
  XCircle,
  Truck,
  PackageCheck,
  UserRound,
  CalendarDays,
  ArrowRight,
  X,
  Building2,
  Phone,
  Mail,
  Power,
  PowerOff,
  ReceiptText,
} from "lucide-react";

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
          ? {
              ...proveedor,
              activo: !proveedor.activo,
            }
          : proveedor
      )
    );

    setProveedorSeleccionado((actual) =>
      actual && actual.id === id
        ? {
            ...actual,
            activo: !actual.activo,
          }
        : actual
    );
  }

  return (
    <div className="compras-page">

      {/* =========================
          ENCABEZADO
      ========================= */}

      <header className="compras-header">

        <div>
          <p className="page-eyebrow">
            COMPRAS
          </p>

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

        <button
          type="button"
          className="primary-button compras-primary-action"
        >
          <Plus
            size={18}
            strokeWidth={1.9}
          />

          {seccionActiva === "ordenes"
            ? "Nueva compra"
            : "Nuevo proveedor"}
        </button>

      </header>

      {/* =========================
          NAVEGACIÓN INTERNA
      ========================= */}

      <nav className="compras-nav">

        <button
          type="button"
          className={
            seccionActiva === "ordenes"
              ? "active"
              : ""
          }
          onClick={() => {
            setSeccionActiva("ordenes");
            setBusqueda("");
            setFiltroEstado("todas");
          }}
        >
          <ShoppingCart
            size={16}
            strokeWidth={1.9}
          />

          Órdenes
        </button>

        <button
          type="button"
          className={
            seccionActiva === "proveedores"
              ? "active"
              : ""
          }
          onClick={() => {
            setSeccionActiva("proveedores");
            setBusqueda("");
          }}
        >
          <Building2
            size={16}
            strokeWidth={1.9}
          />

          Proveedores
        </button>

      </nav>

      {/* =========================
          ÓRDENES
      ========================= */}

      {seccionActiva === "ordenes" && (
        <>

          <section className="compras-kpis">

            <button
              type="button"
              className={`compra-kpi ${
                filtroEstado === "todas"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("todas")
              }
            >
              <div className="compra-kpi-icon total">
                <ShoppingCart
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Total órdenes
              </span>

              <strong>
                {ordenes.length}
              </strong>

              <small>
                Órdenes registradas
              </small>
            </button>

            <button
              type="button"
              className={`compra-kpi ${
                filtroEstado === "pendiente"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("pendiente")
              }
            >
              <div className="compra-kpi-icon pending">
                <Clock3
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Pendientes
              </span>

              <strong>
                {pendientes}
              </strong>

              <small>
                Por recibir
              </small>
            </button>

            <button
              type="button"
              className={`compra-kpi ${
                filtroEstado === "recibida"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("recibida")
              }
            >
              <div className="compra-kpi-icon success">
                <CircleCheck
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Recibidas
              </span>

              <strong>
                {recibidas}
              </strong>

              <small>
                Ingresadas a inventario
              </small>
            </button>

            <button
              type="button"
              className={`compra-kpi alert ${
                filtroEstado === "cancelada"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("cancelada")
              }
            >
              <div className="compra-kpi-icon danger">
                <XCircle
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Canceladas
              </span>

              <strong>
                {canceladas}
              </strong>

              <small>
                No procesadas
              </small>
            </button>

          </section>

          <section className="compras-toolbar">

            <div className="compras-filters">

              {[
                "todas",
                "pendiente",
                "recibida",
                "cancelada",
              ].map((estado) => (
                <button
                  key={estado}
                  type="button"
                  className={`filter-button ${
                    filtroEstado === estado
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setFiltroEstado(estado)
                  }
                >
                  {estado === "todas"
                    ? "Todas"
                    : nombreEstado(estado)}
                </button>
              ))}

            </div>

            <div className="compras-search">

              <Search
                className="compras-search-icon"
                size={18}
                strokeWidth={1.9}
              />

              <input
                type="text"
                placeholder="Buscar orden o proveedor..."
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
              />

            </div>

          </section>

          <section className="compras-panel">

            <div className="compras-panel-header">

              <div>
                <h2>
                  Historial de órdenes
                </h2>

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

                      <td>
                        <span className="compra-reference">
                          {orden.id}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {orden.proveedor}
                        </strong>
                      </td>

                      <td>
                        {orden.fecha}
                      </td>

                      <td>
                        {orden.productos}
                      </td>

                      <td>
                        <strong>
                          {formatearDinero(orden.total)}
                        </strong>
                      </td>

                      <td>
                        {orden.responsable}
                      </td>

                      <td>
                        <span
                          className={`compra-status ${orden.estado}`}
                        >
                          {nombreEstado(orden.estado)}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="compra-detail-button"
                          onClick={() =>
                            setOrdenSeleccionada(orden)
                          }
                        >
                          Ver detalle

                          <ArrowRight
                            size={15}
                            strokeWidth={1.9}
                          />
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

      {/* =========================
          PROVEEDORES
      ========================= */}

      {seccionActiva === "proveedores" && (
        <>

          <section className="compras-toolbar">

            <div className="proveedores-summary">

              <span>
                {
                  proveedores.filter(
                    (proveedor) => proveedor.activo
                  ).length
                }{" "}
                activos
              </span>

              <span>
                {
                  proveedores.filter(
                    (proveedor) => !proveedor.activo
                  ).length
                }{" "}
                inactivos
              </span>

            </div>

            <div className="compras-search">

              <Search
                className="compras-search-icon"
                size={18}
                strokeWidth={1.9}
              />

              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
              />

            </div>

          </section>

          <section className="proveedores-grid">

            {proveedoresFiltrados.map((proveedor) => (

              <article
                key={proveedor.id}
                className="proveedor-card"
              >

                <div className="proveedor-card-icon">
                  <Building2
                    size={20}
                    strokeWidth={1.9}
                  />
                </div>

                <div className="proveedor-card-header">

                  <div>
                    <h3>
                      {proveedor.nombre}
                    </h3>

                    <span
                      className={`proveedor-status ${
                        proveedor.activo
                          ? "activo"
                          : "inactivo"
                      }`}
                    >
                      {proveedor.activo
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </div>

                </div>

                <div className="proveedor-info">

                  <span>
                    Contacto
                  </span>

                  <strong>
                    <UserRound
                      size={14}
                      strokeWidth={1.9}
                    />

                    {proveedor.contacto}
                  </strong>

                </div>

                <div className="proveedor-info">

                  <span>
                    Teléfono
                  </span>

                  <strong>
                    <Phone
                      size={14}
                      strokeWidth={1.9}
                    />

                    {proveedor.telefono}
                  </strong>

                </div>

                <div className="proveedor-info">

                  <span>
                    Correo
                  </span>

                  <strong>
                    <Mail
                      size={14}
                      strokeWidth={1.9}
                    />

                    {proveedor.email}
                  </strong>

                </div>

                <div className="proveedor-card-footer">

                  <button
                    type="button"
                    className="compra-detail-button"
                    onClick={() =>
                      setProveedorSeleccionado(proveedor)
                    }
                  >
                    Ver detalle

                    <ArrowRight
                      size={15}
                      strokeWidth={1.9}
                    />
                  </button>

                  <button
                    type="button"
                    className={
                      proveedor.activo
                        ? "proveedor-toggle-button deactivate"
                        : "proveedor-toggle-button activate"
                    }
                    onClick={() =>
                      cambiarEstadoProveedor(proveedor.id)
                    }
                  >
                    {proveedor.activo ? (
                      <PowerOff
                        size={14}
                        strokeWidth={1.9}
                      />
                    ) : (
                      <Power
                        size={14}
                        strokeWidth={1.9}
                      />
                    )}

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

      {/* =========================
          DRAWER ORDEN
      ========================= */}

      {ordenSeleccionada && (
        <>

          <div
            className="compra-overlay"
            onClick={() =>
              setOrdenSeleccionada(null)
            }
          ></div>

          <aside className="compra-drawer">

            <div className="compra-drawer-header">

              <div>
                <p className="page-eyebrow">
                  ORDEN DE COMPRA
                </p>

                <h2>
                  {ordenSeleccionada.id}
                </h2>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setOrdenSeleccionada(null)
                }
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div
              className={`compra-drawer-status ${ordenSeleccionada.estado}`}
            >
              <span>
                Estado
              </span>

              <strong>
                {nombreEstado(
                  ordenSeleccionada.estado
                )}
              </strong>
            </div>

            <div className="compra-detail-grid">

              <div>
                <span>
                  Proveedor
                </span>

                <strong>
                  <Truck
                    size={14}
                    strokeWidth={1.9}
                  />

                  {ordenSeleccionada.proveedor}
                </strong>
              </div>

              <div>
                <span>
                  Fecha
                </span>

                <strong>
                  <CalendarDays
                    size={14}
                    strokeWidth={1.9}
                  />

                  {ordenSeleccionada.fecha}
                </strong>
              </div>

              <div>
                <span>
                  Responsable
                </span>

                <strong>
                  <UserRound
                    size={14}
                    strokeWidth={1.9}
                  />

                  {ordenSeleccionada.responsable}
                </strong>
              </div>

              <div>
                <span>
                  Productos
                </span>

                <strong>
                  <PackageCheck
                    size={14}
                    strokeWidth={1.9}
                  />

                  {ordenSeleccionada.productos}
                </strong>
              </div>

            </div>

            <div className="compra-products">

              <h3>
                Productos de la orden
              </h3>

              {ordenSeleccionada.detalle.map(
                (item, index) => (

                  <div
                    key={index}
                    className="compra-product-row"
                  >

                    <div>
                      <strong>
                        {item.producto}
                      </strong>

                      <span>
                        {item.cantidad} ×{" "}
                        {formatearDinero(
                          item.precioUnitario
                        )}
                      </span>
                    </div>

                    <strong>
                      {formatearDinero(
                        item.cantidad *
                          item.precioUnitario
                      )}
                    </strong>

                  </div>

                )
              )}

            </div>

            <div className="compra-total">

              <span>
                Total orden
              </span>

              <strong>
                {formatearDinero(
                  ordenSeleccionada.total
                )}
              </strong>

            </div>

            {ordenSeleccionada.estado === "pendiente" && (

              <div className="compra-actions">

                <button
                  type="button"
                  className="drawer-primary-button"
                  onClick={() =>
                    cambiarEstadoOrden("recibida")
                  }
                >
                  <PackageCheck
                    size={17}
                    strokeWidth={1.9}
                  />

                  Recibir compra
                </button>

                <button
                  type="button"
                  className="drawer-secondary-button"
                  onClick={() =>
                    cambiarEstadoOrden("cancelada")
                  }
                >
                  <XCircle
                    size={17}
                    strokeWidth={1.9}
                  />

                  Cancelar orden
                </button>

              </div>

            )}

          </aside>

        </>
      )}

      {/* =========================
          DRAWER PROVEEDOR
      ========================= */}

      {proveedorSeleccionado && (
        <>

          <div
            className="compra-overlay"
            onClick={() =>
              setProveedorSeleccionado(null)
            }
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
                type="button"
                className="drawer-close"
                onClick={() =>
                  setProveedorSeleccionado(null)
                }
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div
              className={`compra-drawer-status ${
                proveedorSeleccionado.activo
                  ? "recibida"
                  : "cancelada"
              }`}
            >
              <span>
                Estado
              </span>

              <strong>
                {proveedorSeleccionado.activo
                  ? "Activo"
                  : "Inactivo"}
              </strong>
            </div>

            <div className="compra-detail-grid">

              <div>
                <span>
                  Contacto
                </span>

                <strong>
                  <UserRound
                    size={14}
                    strokeWidth={1.9}
                  />

                  {proveedorSeleccionado.contacto}
                </strong>
              </div>

              <div>
                <span>
                  Teléfono
                </span>

                <strong>
                  <Phone
                    size={14}
                    strokeWidth={1.9}
                  />

                  {proveedorSeleccionado.telefono}
                </strong>
              </div>

              <div>
                <span>
                  Correo
                </span>

                <strong>
                  <Mail
                    size={14}
                    strokeWidth={1.9}
                  />

                  {proveedorSeleccionado.email}
                </strong>
              </div>

              <div>
                <span>
                  Órdenes registradas
                </span>

                <strong>
                  <ReceiptText
                    size={14}
                    strokeWidth={1.9}
                  />

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

              <h3>
                Historial de compras
              </h3>

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
                      <strong>
                        {orden.id}
                      </strong>

                      <span>
                        {orden.fecha}
                      </span>
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