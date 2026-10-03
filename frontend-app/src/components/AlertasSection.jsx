import { useMemo, useState } from "react";

import {
  Search,
  BellRing,
  TriangleAlert,
  BellOff,
  CircleCheck,
  PackageX,
  PackageSearch,
  CalendarDays,
  Clock3,
  ArrowRight,
  X,
  Eye,
  Check,
} from "lucide-react";

import "./AlertasSection.css";

function AlertasSection() {
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [alertaSeleccionada, setAlertaSeleccionada] = useState(null);

  const [alertas, setAlertas] = useState([
    {
      id: 1,
      codigo: "ALT-001",
      producto: "Aguardiente Antioqueño",
      tipo: "agotado",
      estado: "activa",
      stock: 0,
      minimo: 10,
      fecha: "02/10/2026",
      hora: "10:35",
    },
    {
      id: 2,
      codigo: "ALT-002",
      producto: "Poker 330ml",
      tipo: "bajo",
      estado: "activa",
      stock: 12,
      minimo: 24,
      fecha: "02/10/2026",
      hora: "09:58",
    },
    {
      id: 3,
      codigo: "ALT-003",
      producto: "Ron Medellín 750ml",
      tipo: "bajo",
      estado: "vista",
      stock: 5,
      minimo: 8,
      fecha: "01/10/2026",
      hora: "19:42",
    },
    {
      id: 4,
      codigo: "ALT-004",
      producto: "Club Colombia",
      tipo: "bajo",
      estado: "silenciada",
      stock: 16,
      minimo: 18,
      fecha: "01/10/2026",
      hora: "17:20",
    },
    {
      id: 5,
      codigo: "ALT-005",
      producto: "Coca-Cola 400ml",
      tipo: "bajo",
      estado: "resuelta",
      stock: 32,
      minimo: 20,
      fecha: "30/09/2026",
      hora: "14:10",
    },
  ]);

  const alertasFiltradas = useMemo(() => {
    return alertas.filter((alerta) => {
      const coincideEstado =
        filtroEstado === "todas" ||
        alerta.estado === filtroEstado;

      const texto = busqueda.toLowerCase();

      const coincideBusqueda =
        alerta.producto.toLowerCase().includes(texto) ||
        alerta.codigo.toLowerCase().includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [alertas, filtroEstado, busqueda]);

  function nombreEstado(estado) {
    if (estado === "activa") return "Activa";
    if (estado === "vista") return "Vista";
    if (estado === "silenciada") return "Silenciada";
    if (estado === "resuelta") return "Resuelta";

    return estado;
  }

  function nombreTipo(tipo) {
    if (tipo === "bajo") return "Stock bajo";
    if (tipo === "agotado") return "Agotado";

    return tipo;
  }

  function cambiarEstado(id, nuevoEstado) {
    setAlertas((actuales) =>
      actuales.map((alerta) =>
        alerta.id === id
          ? {
              ...alerta,
              estado: nuevoEstado,
            }
          : alerta
      )
    );

    setAlertaSeleccionada((actual) =>
      actual && actual.id === id
        ? {
            ...actual,
            estado: nuevoEstado,
          }
        : actual
    );
  }

  function iconoTipo(tipo) {
    if (tipo === "agotado") {
      return (
        <PackageX
          size={17}
          strokeWidth={1.9}
        />
      );
    }

    return (
      <TriangleAlert
        size={17}
        strokeWidth={1.9}
      />
    );
  }

  return (
    <div className="alertas-section">

      {/* =========================
          KPIs
      ========================= */}

      <section className="alertas-kpis">

        <button
          type="button"
          className={`alerta-kpi ${
            filtroEstado === "todas" ? "selected" : ""
          }`}
          onClick={() => setFiltroEstado("todas")}
        >
          <div className="alerta-kpi-icon total">
            <BellRing
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>Total</span>

          <strong>
            {alertas.length}
          </strong>

          <small>
            Alertas registradas
          </small>
        </button>

        <button
          type="button"
          className={`alerta-kpi danger ${
            filtroEstado === "activa" ? "selected" : ""
          }`}
          onClick={() => setFiltroEstado("activa")}
        >
          <div className="alerta-kpi-icon danger">
            <TriangleAlert
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>Activas</span>

          <strong>
            {
              alertas.filter(
                (alerta) => alerta.estado === "activa"
              ).length
            }
          </strong>

          <small>
            Requieren atención
          </small>
        </button>

        <button
          type="button"
          className={`alerta-kpi ${
            filtroEstado === "silenciada"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            setFiltroEstado("silenciada")
          }
        >
          <div className="alerta-kpi-icon muted">
            <BellOff
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>Silenciadas</span>

          <strong>
            {
              alertas.filter(
                (alerta) =>
                  alerta.estado === "silenciada"
              ).length
            }
          </strong>

          <small>
            Sin notificación activa
          </small>
        </button>

        <button
          type="button"
          className={`alerta-kpi ${
            filtroEstado === "resuelta"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            setFiltroEstado("resuelta")
          }
        >
          <div className="alerta-kpi-icon success">
            <CircleCheck
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>Resueltas</span>

          <strong>
            {
              alertas.filter(
                (alerta) => alerta.estado === "resuelta"
              ).length
            }
          </strong>

          <small>
            Historial cerrado
          </small>
        </button>

      </section>

      {/* =========================
          FILTROS
      ========================= */}

      <section className="alertas-toolbar">

        <div className="alertas-filters">

          {[
            "todas",
            "activa",
            "vista",
            "silenciada",
            "resuelta",
          ].map((estado) => (

            <button
              key={estado}
              type="button"
              className={`filter-button ${
                filtroEstado === estado ? "active" : ""
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

        <div className="alertas-search">

          <Search
            className="alertas-search-icon"
            size={18}
            strokeWidth={1.9}
          />

          <input
            type="text"
            placeholder="Buscar alerta o producto..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />

        </div>

      </section>

      {/* =========================
          LISTADO
      ========================= */}

      <section className="alertas-panel">

        <div className="alertas-panel-header">

          <div>
            <h2>
              Alertas de inventario
            </h2>

            <p>
              {alertasFiltradas.length} alertas encontradas
            </p>
          </div>

        </div>

        <div className="alertas-list">

          {alertasFiltradas.map((alerta) => (

            <article
              key={alerta.id}
              className={`alerta-row ${alerta.tipo}`}
            >

              <div
                className={`alerta-indicator ${alerta.tipo}`}
              >
                {iconoTipo(alerta.tipo)}
              </div>

              <div className="alerta-main">

                <div>
                  <strong>
                    {alerta.producto}
                  </strong>

                  <span>
                    {alerta.codigo}
                  </span>
                </div>

                <div className="alerta-stock">

                  <span>
                    Stock:
                    <strong>
                      {alerta.stock}
                    </strong>
                  </span>

                  <span>
                    Mínimo:
                    <strong>
                      {alerta.minimo}
                    </strong>
                  </span>

                </div>

              </div>

              <span
                className={`alerta-type ${alerta.tipo}`}
              >
                {nombreTipo(alerta.tipo)}
              </span>

              <span
                className={`alerta-status ${alerta.estado}`}
              >
                {nombreEstado(alerta.estado)}
              </span>

              <div className="alerta-date">

                <span>
                  <CalendarDays
                    size={13}
                    strokeWidth={1.9}
                  />

                  {alerta.fecha}
                </span>

                <small>
                  <Clock3
                    size={13}
                    strokeWidth={1.9}
                  />

                  {alerta.hora}
                </small>

              </div>

              <button
                type="button"
                className="alerta-detail-button"
                onClick={() =>
                  setAlertaSeleccionada(alerta)
                }
              >
                Ver detalle

                <ArrowRight
                  size={15}
                  strokeWidth={1.9}
                />
              </button>

            </article>

          ))}

        </div>

      </section>

      {/* =========================
          DRAWER
      ========================= */}

      {alertaSeleccionada && (
        <>

          <div
            className="alerta-overlay"
            onClick={() =>
              setAlertaSeleccionada(null)
            }
          ></div>

          <aside className="alerta-drawer">

            <div className="alerta-drawer-header">

              <div>
                <p className="page-eyebrow">
                  ALERTA DE INVENTARIO
                </p>

                <h2>
                  {alertaSeleccionada.producto}
                </h2>

                <span>
                  {alertaSeleccionada.codigo}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setAlertaSeleccionada(null)
                }
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className="alerta-drawer-status">

              <div
                className={`alerta-drawer-type ${alertaSeleccionada.tipo}`}
              >
                <span>
                  Tipo
                </span>

                <strong>
                  {iconoTipo(alertaSeleccionada.tipo)}

                  {nombreTipo(
                    alertaSeleccionada.tipo
                  )}
                </strong>
              </div>

              <div
                className={`alerta-drawer-state ${alertaSeleccionada.estado}`}
              >
                <span>
                  Estado
                </span>

                <strong>
                  {nombreEstado(
                    alertaSeleccionada.estado
                  )}
                </strong>
              </div>

            </div>

            <div className="alerta-detail-grid">

              <div>
                <span>
                  Stock actual
                </span>

                <strong>
                  <PackageSearch
                    size={15}
                    strokeWidth={1.9}
                  />

                  {alertaSeleccionada.stock}
                </strong>
              </div>

              <div>
                <span>
                  Stock mínimo
                </span>

                <strong>
                  {alertaSeleccionada.minimo}
                </strong>
              </div>

              <div>
                <span>
                  Fecha
                </span>

                <strong>
                  <CalendarDays
                    size={15}
                    strokeWidth={1.9}
                  />

                  {alertaSeleccionada.fecha}
                </strong>
              </div>

              <div>
                <span>
                  Hora
                </span>

                <strong>
                  <Clock3
                    size={15}
                    strokeWidth={1.9}
                  />

                  {alertaSeleccionada.hora}
                </strong>
              </div>

            </div>

            <div className="alerta-actions">

              <button
                type="button"
                className="drawer-primary-button"
                onClick={() =>
                  cambiarEstado(
                    alertaSeleccionada.id,
                    "resuelta"
                  )
                }
              >
                <Check
                  size={17}
                  strokeWidth={1.9}
                />

                Marcar como resuelta
              </button>

              <button
                type="button"
                className="drawer-secondary-button"
                onClick={() =>
                  cambiarEstado(
                    alertaSeleccionada.id,
                    "vista"
                  )
                }
              >
                <Eye
                  size={17}
                  strokeWidth={1.9}
                />

                Marcar como vista
              </button>

              <button
                type="button"
                className="drawer-secondary-button"
                onClick={() =>
                  cambiarEstado(
                    alertaSeleccionada.id,
                    "silenciada"
                  )
                }
              >
                <BellOff
                  size={17}
                  strokeWidth={1.9}
                />

                Silenciar alerta
              </button>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default AlertasSection;