import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Plus,
  Search,
  Armchair,
  ReceiptText,
  Clock3,
  WalletCards,
  ArrowRight,
  X,
} from "lucide-react";

import "./MesasPage.css";

function MesasPage() {
  const navigate = useNavigate();

  const [mesas, setMesas] = useState([
    { id: 1, estado: "ocupada", pedido: "P-3842", tiempo: "24 min" },
    { id: 2, estado: "ocupada", pedido: "P-3845", tiempo: "18 min" },
    { id: 3, estado: "disponible" },
    { id: 4, estado: "ocupada", pedido: "P-3846", tiempo: "31 min" },
    { id: 5, estado: "disponible" },
    { id: 6, estado: "por-cobrar", pedido: "P-3839", tiempo: "42 min" },
    { id: 7, estado: "disponible" },
    { id: 8, estado: "ocupada", pedido: "P-3847", tiempo: "12 min" },
    { id: 9, estado: "disponible" },
    { id: 10, estado: "ocupada", pedido: "P-3848", tiempo: "8 min" },
    { id: 11, estado: "disponible" },
    { id: 12, estado: "disponible" },
  ]);

  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [busqueda, setBusqueda] = useState("");

  function cerrarPanel() {
    setMesaSeleccionada(null);
  }

  function abrirMesa() {
    if (!mesaSeleccionada) return;

    const nuevoPedido = `P-${3850 + mesaSeleccionada.id}`;

    setMesas((mesasActuales) =>
      mesasActuales.map((mesa) =>
        mesa.id === mesaSeleccionada.id
          ? {
              ...mesa,
              estado: "ocupada",
              pedido: nuevoPedido,
              tiempo: "0 min",
            }
          : mesa
      )
    );

    setMesaSeleccionada({
      ...mesaSeleccionada,
      estado: "ocupada",
      pedido: nuevoPedido,
      tiempo: "0 min",
    });
  }

  function verPedido() {
    navigate("/operacion/pedidos");
  }

  function irACaja() {
    navigate("/caja");
  }

  const totalMesas = mesas.length;

  const disponibles = mesas.filter(
    (mesa) => mesa.estado === "disponible"
  ).length;

  const ocupadas = mesas.filter(
    (mesa) => mesa.estado === "ocupada"
  ).length;

  const porCobrar = mesas.filter(
    (mesa) => mesa.estado === "por-cobrar"
  ).length;

  const mesasFiltradas = mesas.filter((mesa) => {
    const coincideEstado =
      filtroEstado === "todas" || mesa.estado === filtroEstado;

    const texto = busqueda.trim().toLowerCase();

    const coincideBusqueda =
      texto === "" ||
      `mesa ${mesa.id}`.includes(texto) ||
      `m${mesa.id}`.includes(texto) ||
      String(mesa.id).includes(texto) ||
      mesa.pedido?.toLowerCase().includes(texto);

    return coincideEstado && coincideBusqueda;
  });

  return (
    <div className="mesas-page">

      {/* =========================
          ENCABEZADO
      ========================= */}

      <header className="mesas-header">
        <div>
          <p className="page-eyebrow">
            OPERACIÓN
          </p>

          <h1 className="page-title">
            Mesas
          </h1>

          <p className="page-description">
            Consulta y administra el estado actual del salón.
          </p>
        </div>

        <button
          type="button"
          className="primary-button mesas-open-button"
          onClick={() => {
            const primeraDisponible = mesas.find(
              (mesa) => mesa.estado === "disponible"
            );

            if (primeraDisponible) {
              setMesaSeleccionada(primeraDisponible);
            }
          }}
        >
          <Plus
            size={18}
            strokeWidth={1.9}
          />

          Abrir mesa
        </button>
      </header>

      {/* =========================
          KPIs
      ========================= */}

      <section className="mesas-kpis">

        <article className="mesa-kpi">
          <div className="mesa-kpi-icon neutral">
            <Armchair
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>Total de mesas</span>

          <strong>{totalMesas}</strong>

          <small>
            Salón principal
          </small>
        </article>

        <article className="mesa-kpi">
          <div className="mesa-kpi-icon success">
            <Armchair
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>Disponibles</span>

          <strong>{disponibles}</strong>

          <small className="mesa-success">
            Listas para usar
          </small>
        </article>

        <article className="mesa-kpi">
          <div className="mesa-kpi-icon occupied">
            <ReceiptText
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>Ocupadas</span>

          <strong>{ocupadas}</strong>

          <small>
            Con pedido activo
          </small>
        </article>

        <article className="mesa-kpi">
          <div className="mesa-kpi-icon warning">
            <WalletCards
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>Por cobrar</span>

          <strong>{porCobrar}</strong>

          <small className="mesa-warning">
            Requiere atención
          </small>
        </article>

      </section>

      {/* =========================
          FILTROS
      ========================= */}

      <section className="mesas-toolbar">

        <div className="mesa-filters">

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "todas" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("todas")}
          >
            Todas
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "disponible" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("disponible")}
          >
            Disponibles
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "ocupada" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("ocupada")}
          >
            Ocupadas
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "por-cobrar" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("por-cobrar")}
          >
            Por cobrar
          </button>

        </div>

        <div className="mesa-search">
          <Search
            className="mesa-search-icon"
            size={18}
            strokeWidth={1.9}
            aria-hidden="true"
          />

          <input
            type="text"
            placeholder="Buscar mesa o pedido..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />
        </div>

      </section>

      {/* =========================
          SALÓN
      ========================= */}

      <section className="salon-panel">

        <div className="salon-header">

          <div>
            <h2>
              Salón principal
            </h2>

            <p>
              Estado actual de las mesas
            </p>
          </div>

          <div className="salon-legend">

            <span>
              <i className="legend-dot available"></i>
              Disponible
            </span>

            <span>
              <i className="legend-dot occupied"></i>
              Ocupada
            </span>

            <span>
              <i className="legend-dot payment"></i>
              Por cobrar
            </span>

          </div>

        </div>

        <div className="salon-map">

          <div className="salon-zone bar-zone">
            BARRA
          </div>

          <div className="mesas-grid">

            {mesasFiltradas.map((mesa) => (
              <article
                key={mesa.id}
                className={`mesa-card ${mesa.estado}`}
                onClick={() =>
                  setMesaSeleccionada(mesa)
                }
              >

                <div className="mesa-number">
                  M{mesa.id}
                </div>

                <div className="mesa-info">

                  {mesa.estado === "disponible" && (
                    <>
                      <strong>
                        Disponible
                      </strong>

                      <span>
                        Lista para abrir
                      </span>
                    </>
                  )}

                  {mesa.estado === "ocupada" && (
                    <>
                      <strong>
                        Ocupada
                      </strong>

                      <span>
                        {mesa.pedido}
                      </span>

                      <small>
                        <Clock3
                          size={13}
                          strokeWidth={1.9}
                        />

                        {mesa.tiempo}
                      </small>
                    </>
                  )}

                  {mesa.estado === "por-cobrar" && (
                    <>
                      <strong>
                        Por cobrar
                      </strong>

                      <span>
                        {mesa.pedido}
                      </span>

                      <small>
                        <Clock3
                          size={13}
                          strokeWidth={1.9}
                        />

                        {mesa.tiempo}
                      </small>
                    </>
                  )}

                </div>

              </article>
            ))}

          </div>

          <div className="salon-zone entrance-zone">
            ENTRADA
          </div>

        </div>

      </section>

      {/* =========================
          DRAWER
      ========================= */}

      {mesaSeleccionada && (
        <>
          <div
            className="mesa-overlay"
            onClick={cerrarPanel}
          ></div>

          <aside className="mesa-drawer">

            <div className="mesa-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DE MESA
                </p>

                <h2>
                  Mesa {mesaSeleccionada.id}
                </h2>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={cerrarPanel}
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className={`drawer-status ${mesaSeleccionada.estado}`}>
              <span>
                Estado actual
              </span>

              <strong>
                {mesaSeleccionada.estado === "disponible" &&
                  "Disponible"}

                {mesaSeleccionada.estado === "ocupada" &&
                  "Ocupada"}

                {mesaSeleccionada.estado === "por-cobrar" &&
                  "Por cobrar"}
              </strong>
            </div>

            {/* DISPONIBLE */}

            {mesaSeleccionada.estado === "disponible" && (
              <div className="drawer-content">

                <p>
                  Esta mesa se encuentra disponible y puede abrirse
                  para iniciar una nueva atención.
                </p>

                <button
                  type="button"
                  className="drawer-primary-button"
                  onClick={abrirMesa}
                >
                  <Plus
                    size={18}
                    strokeWidth={1.9}
                  />

                  Abrir mesa
                </button>

              </div>
            )}

            {/* OCUPADA */}

            {mesaSeleccionada.estado === "ocupada" && (
              <div className="drawer-content">

                <div className="drawer-data">
                  <span>
                    Pedido activo
                  </span>

                  <strong>
                    {mesaSeleccionada.pedido}
                  </strong>
                </div>

                <div className="drawer-data">
                  <span>
                    Tiempo de atención
                  </span>

                  <strong>
                    {mesaSeleccionada.tiempo}
                  </strong>
                </div>

                <div className="drawer-actions">

                  <button
                    type="button"
                    className="drawer-primary-button"
                    onClick={verPedido}
                  >
                    Ver pedido

                    <ArrowRight
                      size={17}
                      strokeWidth={1.9}
                    />
                  </button>

                  <button
                    type="button"
                    className="drawer-secondary-button"
                    onClick={verPedido}
                  >
                    <Plus
                      size={17}
                      strokeWidth={1.9}
                    />

                    Agregar productos
                  </button>

                </div>

              </div>
            )}

            {/* POR COBRAR */}

            {mesaSeleccionada.estado === "por-cobrar" && (
              <div className="drawer-content">

                <div className="drawer-data">
                  <span>
                    Pedido
                  </span>

                  <strong>
                    {mesaSeleccionada.pedido}
                  </strong>
                </div>

                <div className="drawer-data">
                  <span>
                    Tiempo total
                  </span>

                  <strong>
                    {mesaSeleccionada.tiempo}
                  </strong>
                </div>

                <div className="drawer-actions">

                  <button
                    type="button"
                    className="drawer-primary-button"
                    onClick={irACaja}
                  >
                    <WalletCards
                      size={17}
                      strokeWidth={1.9}
                    />

                    Cobrar
                  </button>

                  <button
                    type="button"
                    className="drawer-secondary-button"
                    onClick={irACaja}
                  >
                    Ver cuenta

                    <ArrowRight
                      size={17}
                      strokeWidth={1.9}
                    />
                  </button>

                </div>

              </div>
            )}

          </aside>
        </>
      )}

    </div>
  );
}

export default MesasPage;