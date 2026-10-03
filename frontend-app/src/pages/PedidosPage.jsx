import { useState } from "react";

import {
  Plus,
  Search,
  ReceiptText,
  CookingPot,
  CircleCheck,
  TriangleAlert,
  Clock3,
  ArrowRight,
  X,
  PackagePlus,
} from "lucide-react";

import "./PedidosPage.css";

function PedidosPage() {
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const pedidos = [
    {
      id: "P-3842",
      mesa: "Mesa 1",
      mesero: "Laura",
      productos: 5,
      total: "$86.000",
      tiempo: "24 min",
      estado: "abierto",
    },
    {
      id: "P-3845",
      mesa: "Mesa 2",
      mesero: "Carlos",
      productos: 3,
      total: "$54.000",
      tiempo: "18 min",
      estado: "preparando",
    },
    {
      id: "P-3846",
      mesa: "Mesa 4",
      mesero: "Laura",
      productos: 6,
      total: "$112.000",
      tiempo: "31 min",
      estado: "retrasado",
    },
    {
      id: "P-3847",
      mesa: "Mesa 8",
      mesero: "Daniela",
      productos: 2,
      total: "$38.000",
      tiempo: "12 min",
      estado: "listo",
    },
    {
      id: "P-3848",
      mesa: "Mesa 10",
      mesero: "Carlos",
      productos: 4,
      total: "$71.000",
      tiempo: "8 min",
      estado: "abierto",
    },
  ];

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const coincideEstado =
      filtroEstado === "todos" || pedido.estado === filtroEstado;

    const textoBusqueda = busqueda.trim().toLowerCase();

    const coincideBusqueda =
      textoBusqueda === "" ||
      pedido.id.toLowerCase().includes(textoBusqueda) ||
      pedido.mesa.toLowerCase().includes(textoBusqueda) ||
      pedido.mesero.toLowerCase().includes(textoBusqueda);

    return coincideEstado && coincideBusqueda;
  });

  const abiertos = pedidos.filter(
    (pedido) => pedido.estado === "abierto"
  ).length;

  const preparando = pedidos.filter(
    (pedido) => pedido.estado === "preparando"
  ).length;

  const listos = pedidos.filter(
    (pedido) => pedido.estado === "listo"
  ).length;

  const retrasados = pedidos.filter(
    (pedido) => pedido.estado === "retrasado"
  ).length;

  function cerrarDetalle() {
    setPedidoSeleccionado(null);
  }

  function nombreEstado(estado) {
    if (estado === "abierto") return "Abierto";
    if (estado === "preparando") return "Preparando";
    if (estado === "listo") return "Listo";
    if (estado === "retrasado") return "Retrasado";

    return estado;
  }

  return (
    <div className="pedidos-page">

      {/* =========================
          ENCABEZADO
      ========================= */}

      <header className="pedidos-header">

        <div>
          <p className="page-eyebrow">
            OPERACIÓN
          </p>

          <h1 className="page-title">
            Pedidos
          </h1>

          <p className="page-description">
            Consulta y supervisa los pedidos activos del negocio.
          </p>
        </div>

        <button
          type="button"
          className="primary-button pedidos-new-button"
        >
          <Plus
            size={18}
            strokeWidth={1.9}
          />

          Nuevo pedido
        </button>

      </header>

      {/* =========================
          KPIs / ESTADOS
      ========================= */}

      <section className="pedidos-kpis">

        <button
          type="button"
          className={`pedido-kpi abierto ${
            filtroEstado === "abierto" ? "selected" : ""
          }`}
          onClick={() => setFiltroEstado("abierto")}
        >
          <div className="pedido-kpi-icon abierto">
            <ReceiptText
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Abiertos
          </span>

          <strong>
            {abiertos}
          </strong>

          <small>
            Pedidos registrados
          </small>
        </button>

        <button
          type="button"
          className={`pedido-kpi preparando ${
            filtroEstado === "preparando" ? "selected" : ""
          }`}
          onClick={() => setFiltroEstado("preparando")}
        >
          <div className="pedido-kpi-icon preparando">
            <CookingPot
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Preparando
          </span>

          <strong>
            {preparando}
          </strong>

          <small>
            En proceso
          </small>
        </button>

        <button
          type="button"
          className={`pedido-kpi listo ${
            filtroEstado === "listo" ? "selected" : ""
          }`}
          onClick={() => setFiltroEstado("listo")}
        >
          <div className="pedido-kpi-icon listo">
            <CircleCheck
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Listos
          </span>

          <strong>
            {listos}
          </strong>

          <small>
            Para entregar
          </small>
        </button>

        <button
          type="button"
          className={`pedido-kpi alert retrasado ${
            filtroEstado === "retrasado" ? "selected" : ""
          }`}
          onClick={() => setFiltroEstado("retrasado")}
        >
          <div className="pedido-kpi-icon retrasado">
            <TriangleAlert
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Retrasados
          </span>

          <strong>
            {retrasados}
          </strong>

          <small>
            Requieren atención
          </small>
        </button>

      </section>

      {/* =========================
          FILTROS
      ========================= */}

      <section className="pedidos-toolbar">

        <div className="pedido-filters">

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "todos" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("todos")}
          >
            Todos
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "abierto" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("abierto")}
          >
            Abiertos
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "preparando" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("preparando")}
          >
            Preparando
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "listo" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("listo")}
          >
            Listos
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "retrasado" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("retrasado")}
          >
            Retrasados
          </button>

        </div>

        <div className="pedido-search">

          <Search
            className="pedido-search-icon"
            size={18}
            strokeWidth={1.9}
            aria-hidden="true"
          />

          <input
            type="text"
            placeholder="Buscar pedido, mesa o mesero..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />

        </div>

      </section>

      {/* =========================
          TABLA
      ========================= */}

      <section className="pedidos-table-panel">

        <div className="pedidos-table-header">

          <div>
            <h2>
              Pedidos actuales
            </h2>

            <p>
              {pedidosFiltrados.length} pedidos encontrados
            </p>
          </div>

        </div>

        <div className="pedidos-table-wrapper">

          <table className="pedidos-table">

            <thead>
              <tr>
                <th>Pedido</th>
                <th>Mesa</th>
                <th>Mesero</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Tiempo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {pedidosFiltrados.map((pedido) => (
                <tr
                  key={pedido.id}
                  className={
                    pedido.estado === "retrasado"
                      ? "pedido-row delayed"
                      : "pedido-row"
                  }
                >

                  <td>
                    <strong className="pedido-code">
                      {pedido.id}
                    </strong>
                  </td>

                  <td>
                    {pedido.mesa}
                  </td>

                  <td>
                    {pedido.mesero}
                  </td>

                  <td>
                    {pedido.productos} productos
                  </td>

                  <td>
                    <strong>
                      {pedido.total}
                    </strong>
                  </td>

                  <td>
                    <span className="pedido-time">
                      <Clock3
                        size={14}
                        strokeWidth={1.9}
                      />

                      {pedido.tiempo}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`pedido-status ${pedido.estado}`}
                    >
                      {nombreEstado(pedido.estado)}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="pedido-detail-button"
                      onClick={() =>
                        setPedidoSeleccionado(pedido)
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

      {/* =========================
          DRAWER
      ========================= */}

      {pedidoSeleccionado && (
        <>

          <div
            className="pedido-overlay"
            onClick={cerrarDetalle}
          ></div>

          <aside className="pedido-drawer">

            <div className="pedido-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DEL PEDIDO
                </p>

                <h2>
                  {pedidoSeleccionado.id}
                </h2>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={cerrarDetalle}
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div
              className={`pedido-drawer-status ${pedidoSeleccionado.estado}`}
            >
              <span>
                Estado
              </span>

              <strong>
                {nombreEstado(
                  pedidoSeleccionado.estado
                )}
              </strong>
            </div>

            <div className="pedido-drawer-data">

              <div>
                <span>
                  Mesa
                </span>

                <strong>
                  {pedidoSeleccionado.mesa}
                </strong>
              </div>

              <div>
                <span>
                  Mesero
                </span>

                <strong>
                  {pedidoSeleccionado.mesero}
                </strong>
              </div>

              <div>
                <span>
                  Productos
                </span>

                <strong>
                  {pedidoSeleccionado.productos}
                </strong>
              </div>

              <div>
                <span>
                  Tiempo
                </span>

                <strong className="drawer-time-value">
                  <Clock3
                    size={15}
                    strokeWidth={1.9}
                  />

                  {pedidoSeleccionado.tiempo}
                </strong>
              </div>

            </div>

            <div className="pedido-products">

              <h3>
                Resumen del pedido
              </h3>

              <div className="pedido-product-row">
                <span>
                  2 × Poker 330ml
                </span>

                <strong>
                  $18.000
                </strong>
              </div>

              <div className="pedido-product-row">
                <span>
                  1 × Hamburguesa especial
                </span>

                <strong>
                  $28.000
                </strong>
              </div>

              <div className="pedido-product-row">
                <span>
                  2 × Aguardiente
                </span>

                <strong>
                  $40.000
                </strong>
              </div>

            </div>

            <div className="pedido-total">

              <span>
                Total pedido
              </span>

              <strong>
                {pedidoSeleccionado.total}
              </strong>

            </div>

            <div className="pedido-drawer-actions">

              <button
                type="button"
                className="drawer-primary-button"
              >
                <ReceiptText
                  size={18}
                  strokeWidth={1.9}
                />

                Ver pedido completo
              </button>

              <button
                type="button"
                className="drawer-secondary-button"
              >
                <PackagePlus
                  size={18}
                  strokeWidth={1.9}
                />

                Agregar productos
              </button>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default PedidosPage;