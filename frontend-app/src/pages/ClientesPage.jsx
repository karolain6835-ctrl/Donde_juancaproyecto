import { useMemo, useState } from "react";

import {
  Users,
  UserRound,
  UserCheck,
  UserX,
  History,
  Search,
  Plus,
  Phone,
  Mail,
  CalendarDays,
  ReceiptText,
  BadgeDollarSign,
  ArrowRight,
  X,
  Power,
  PowerOff,
  Package,
} from "lucide-react";

import HistorialClientesSection from "../components/HistorialClientesSection";

import "./ClientesPage.css";

function ClientesPage() {
  const [seccionActiva, setSeccionActiva] = useState("lista");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [clientes, setClientes] = useState([
    {
      id: 1,
      documento: "1032456789",
      nombre: "Andrés Gómez",
      telefono: "300 456 7821",
      email: "andres.gomez@email.com",
      estado: "activo",
      visitas: 18,
      gastoTotal: 1264000,
      ticketPromedio: 70222,
      productosFavoritos: [
        "Poker 330ml",
        "Club Colombia",
        "Sesión de billar",
      ],
      ultimasVisitas: [
        {
          fecha: "01/10/2026",
          pedido: "P-3821",
          total: 92000,
        },
        {
          fecha: "24/09/2026",
          pedido: "P-3779",
          total: 68000,
        },
      ],
    },
    {
      id: 2,
      documento: "1026587412",
      nombre: "María Fernanda Ruiz",
      telefono: "311 784 2290",
      email: "maria.ruiz@email.com",
      estado: "activo",
      visitas: 12,
      gastoTotal: 846000,
      ticketPromedio: 70500,
      productosFavoritos: [
        "Aguardiente Antioqueño",
        "Coca-Cola 400ml",
        "Tejo",
      ],
      ultimasVisitas: [
        {
          fecha: "30/09/2026",
          pedido: "P-3804",
          total: 112000,
        },
        {
          fecha: "18/09/2026",
          pedido: "P-3710",
          total: 74000,
        },
      ],
    },
    {
      id: 3,
      documento: "1019234587",
      nombre: "Juan Pablo López",
      telefono: "315 660 1842",
      email: "juan.lopez@email.com",
      estado: "activo",
      visitas: 7,
      gastoTotal: 428000,
      ticketPromedio: 61143,
      productosFavoritos: [
        "Ron Medellín",
        "Hielo",
        "Bolirana",
      ],
      ultimasVisitas: [
        {
          fecha: "29/09/2026",
          pedido: "P-3798",
          total: 86000,
        },
      ],
    },
    {
      id: 4,
      documento: "1005874123",
      nombre: "Sofía Martínez",
      telefono: "320 445 7788",
      email: "sofia.martinez@email.com",
      estado: "inactivo",
      visitas: 3,
      gastoTotal: 165000,
      ticketPromedio: 55000,
      productosFavoritos: [
        "Club Colombia",
        "Papas",
      ],
      ultimasVisitas: [
        {
          fecha: "14/08/2026",
          pedido: "P-3421",
          total: 54000,
        },
      ],
    },
  ]);

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return clientes.filter((cliente) => {
      const coincideEstado =
        filtroEstado === "todos" ||
        cliente.estado === filtroEstado;

      const coincideBusqueda =
        cliente.nombre.toLowerCase().includes(texto) ||
        cliente.documento.toLowerCase().includes(texto) ||
        cliente.telefono.toLowerCase().includes(texto) ||
        cliente.email.toLowerCase().includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [clientes, busqueda, filtroEstado]);

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function cambiarEstadoCliente(id) {
    setClientes((actuales) =>
      actuales.map((cliente) =>
        cliente.id === id
          ? {
              ...cliente,
              estado:
                cliente.estado === "activo"
                  ? "inactivo"
                  : "activo",
            }
          : cliente
      )
    );

    setClienteSeleccionado((actual) =>
      actual && actual.id === id
        ? {
            ...actual,
            estado:
              actual.estado === "activo"
                ? "inactivo"
                : "activo",
          }
        : actual
    );
  }

  const totalVisitas = clientes.reduce(
    (total, cliente) => total + cliente.visitas,
    0
  );

  return (
    <div className="clientes-page">

      <header className="clientes-header">

        <div>
          <p className="page-eyebrow">
            CLIENTES
          </p>

          <h1 className="page-title">
            {seccionActiva === "lista"
              ? "Lista de clientes"
              : "Historial de consumo"}
          </h1>

          <p className="page-description">
            Consulta clientes, visitas y comportamiento de consumo.
          </p>
        </div>

        {seccionActiva === "lista" && (

          <button
            type="button"
            className="primary-button clientes-new-button"
          >
            <Plus size={17} strokeWidth={1.9} />

            Nuevo cliente
          </button>

        )}

      </header>

      <nav className="clientes-nav">

        <button
          type="button"
          className={seccionActiva === "lista" ? "active" : ""}
          onClick={() => {
            setSeccionActiva("lista");
            setBusqueda("");
          }}
        >
          <Users size={16} strokeWidth={1.9} />

          Lista de clientes
        </button>

        <button
          type="button"
          className={seccionActiva === "historial" ? "active" : ""}
          onClick={() => {
            setSeccionActiva("historial");
            setBusqueda("");
          }}
        >
          <History size={16} strokeWidth={1.9} />

          Historial de consumo
        </button>

      </nav>

      {seccionActiva === "lista" && (
        <>

          <section className="clientes-kpis">

            <button
              type="button"
              className={`cliente-kpi ${
                filtroEstado === "todos" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("todos")}
            >
              <div className="cliente-kpi-icon total">
                <Users size={20} strokeWidth={1.9} />
              </div>

              <span>
                Total clientes
              </span>

              <strong>
                {clientes.length}
              </strong>

              <small>
                Registrados
              </small>
            </button>

            <button
              type="button"
              className={`cliente-kpi ${
                filtroEstado === "activo" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("activo")}
            >
              <div className="cliente-kpi-icon active">
                <UserCheck size={20} strokeWidth={1.9} />
              </div>

              <span>
                Activos
              </span>

              <strong>
                {
                  clientes.filter(
                    (cliente) => cliente.estado === "activo"
                  ).length
                }
              </strong>

              <small>
                Disponibles para atención
              </small>
            </button>

            <button
              type="button"
              className={`cliente-kpi ${
                filtroEstado === "inactivo" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("inactivo")}
            >
              <div className="cliente-kpi-icon inactive">
                <UserX size={20} strokeWidth={1.9} />
              </div>

              <span>
                Inactivos
              </span>

              <strong>
                {
                  clientes.filter(
                    (cliente) => cliente.estado === "inactivo"
                  ).length
                }
              </strong>

              <small>
                Fuera de uso
              </small>
            </button>

            <article className="cliente-kpi">

              <div className="cliente-kpi-icon visits">
                <CalendarDays size={20} strokeWidth={1.9} />
              </div>

              <span>
                Visitas acumuladas
              </span>

              <strong>
                {totalVisitas}
              </strong>

              <small>
                Histórico registrado
              </small>

            </article>

          </section>

          <section className="clientes-toolbar">

            <div className="clientes-filters">

              {["todos", "activo", "inactivo"].map(
                (estado) => (

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
                    {estado === "todos"
                      ? "Todos"
                      : estado === "activo"
                      ? "Activos"
                      : "Inactivos"}
                  </button>

                )
              )}

            </div>

            <div className="clientes-search">

              <Search
                className="clientes-search-icon"
                size={18}
                strokeWidth={1.9}
              />

              <input
                type="text"
                placeholder="Buscar cliente..."
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
              />

            </div>

          </section>

          <section className="clientes-panel">

            <div className="clientes-panel-header">

              <div className="clientes-panel-title">

                <div className="clientes-panel-icon">
                  <Users size={18} strokeWidth={1.9} />
                </div>

                <div>
                  <h2>
                    Directorio de clientes
                  </h2>

                  <p>
                    {clientesFiltrados.length} clientes encontrados
                  </p>
                </div>

              </div>

            </div>

            <div className="clientes-table-wrapper">

              <table className="clientes-table">

                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Documento</th>
                    <th>Contacto</th>
                    <th>Visitas</th>
                    <th>Gasto total</th>
                    <th>Ticket promedio</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>

                  {clientesFiltrados.map((cliente) => (

                    <tr key={cliente.id}>

                      <td>

                        <div className="cliente-name-cell">

                          <strong>
                            {cliente.nombre}
                          </strong>

                          <span>
                            {cliente.email}
                          </span>

                        </div>

                      </td>

                      <td>
                        <span className="cliente-document">
                          {cliente.documento}
                        </span>
                      </td>

                      <td>
                        {cliente.telefono}
                      </td>

                      <td>
                        <strong>
                          {cliente.visitas}
                        </strong>
                      </td>

                      <td>
                        {formatearDinero(
                          cliente.gastoTotal
                        )}
                      </td>

                      <td>
                        {formatearDinero(
                          cliente.ticketPromedio
                        )}
                      </td>

                      <td>
                        <span
                          className={`cliente-status ${cliente.estado}`}
                        >
                          {cliente.estado === "activo"
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>

                      <td>

                        <button
                          type="button"
                          className="cliente-detail-button"
                          onClick={() =>
                            setClienteSeleccionado(cliente)
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

      {seccionActiva === "historial" && (
        <HistorialClientesSection />
      )}

      {clienteSeleccionado && (
        <>

          <div
            className="cliente-overlay"
            onClick={() =>
              setClienteSeleccionado(null)
            }
          ></div>

          <aside className="cliente-drawer">

            <div className="cliente-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DEL CLIENTE
                </p>

                <h2>
                  {clienteSeleccionado.nombre}
                </h2>

                <span>
                  CC {clienteSeleccionado.documento}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setClienteSeleccionado(null)
                }
                aria-label="Cerrar detalle"
              >
                <X size={20} strokeWidth={1.9} />
              </button>

            </div>

            <div
              className={`cliente-drawer-status ${clienteSeleccionado.estado}`}
            >

              <span>
                Estado
              </span>

              <strong>
                {clienteSeleccionado.estado === "activo"
                  ? "Activo"
                  : "Inactivo"}
              </strong>

            </div>

            <div className="cliente-detail-grid">

              <div>
                <span>
                  Teléfono
                </span>

                <strong>
                  <Phone size={14} strokeWidth={1.9} />

                  {clienteSeleccionado.telefono}
                </strong>
              </div>

              <div>
                <span>
                  Correo
                </span>

                <strong>
                  <Mail size={14} strokeWidth={1.9} />

                  {clienteSeleccionado.email}
                </strong>
              </div>

              <div>
                <span>
                  Visitas
                </span>

                <strong>
                  <CalendarDays size={14} strokeWidth={1.9} />

                  {clienteSeleccionado.visitas}
                </strong>
              </div>

              <div>
                <span>
                  Ticket promedio
                </span>

                <strong>
                  <BadgeDollarSign size={14} strokeWidth={1.9} />

                  {formatearDinero(
                    clienteSeleccionado.ticketPromedio
                  )}
                </strong>
              </div>

            </div>

            <div className="cliente-spending">

              <div className="cliente-spending-icon">
                <BadgeDollarSign
                  size={21}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <span>
                  Gasto acumulado
                </span>

                <strong>
                  {formatearDinero(
                    clienteSeleccionado.gastoTotal
                  )}
                </strong>
              </div>

            </div>

            <div className="cliente-section">

              <div className="cliente-section-heading">

                <Package
                  size={17}
                  strokeWidth={1.9}
                />

                <h3>
                  Productos más consumidos
                </h3>

              </div>

              <div className="cliente-products-list">

                {clienteSeleccionado.productosFavoritos.map(
                  (producto) => (

                    <span key={producto}>
                      {producto}
                    </span>

                  )
                )}

              </div>

            </div>

            <div className="cliente-section">

              <div className="cliente-section-heading">

                <History
                  size={17}
                  strokeWidth={1.9}
                />

                <h3>
                  Últimas visitas
                </h3>

              </div>

              {clienteSeleccionado.ultimasVisitas.map(
                (visita, index) => (

                  <div
                    key={index}
                    className="cliente-visit-row"
                  >

                    <div>

                      <strong>
                        <ReceiptText
                          size={14}
                          strokeWidth={1.9}
                        />

                        {visita.pedido}
                      </strong>

                      <span>
                        {visita.fecha}
                      </span>

                    </div>

                    <strong>
                      {formatearDinero(
                        visita.total
                      )}
                    </strong>

                  </div>

                )
              )}

            </div>

            <button
              type="button"
              className={
                clienteSeleccionado.estado === "activo"
                  ? "cliente-deactivate-button"
                  : "drawer-primary-button cliente-activate-button"
              }
              onClick={() =>
                cambiarEstadoCliente(
                  clienteSeleccionado.id
                )
              }
            >
              {clienteSeleccionado.estado === "activo" ? (
                <>
                  <PowerOff
                    size={17}
                    strokeWidth={1.9}
                  />

                  Desactivar cliente
                </>
              ) : (
                <>
                  <Power
                    size={17}
                    strokeWidth={1.9}
                  />

                  Activar cliente
                </>
              )}
            </button>

          </aside>

        </>
      )}

    </div>
  );
}

export default ClientesPage;