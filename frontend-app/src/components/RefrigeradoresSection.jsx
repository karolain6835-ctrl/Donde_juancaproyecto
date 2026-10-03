import { useMemo, useState } from "react";

import {
  Search,
  Refrigerator,
  CircleCheck,
  Wrench,
  Power,
  Thermometer,
  Package,
  MapPin,
  ArrowRight,
  X,
  Snowflake,
} from "lucide-react";

import "./RefrigeradoresSection.css";

function RefrigeradoresSection() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [
    refrigeradorSeleccionado,
    setRefrigeradorSeleccionado,
  ] = useState(null);

  const [refrigeradores, setRefrigeradores] = useState([
    {
      id: 1,
      codigo: "REF-001",
      nombre: "Refrigerador Barra 1",
      ubicacion: "Barra principal",
      temperatura: "4 °C",
      productos: 28,
      estado: "activa",
    },
    {
      id: 2,
      codigo: "REF-002",
      nombre: "Refrigerador Barra 2",
      ubicacion: "Barra principal",
      temperatura: "5 °C",
      productos: 19,
      estado: "activa",
    },
    {
      id: 3,
      codigo: "REF-003",
      nombre: "Nevera Cocina",
      ubicacion: "Cocina",
      temperatura: "3 °C",
      productos: 14,
      estado: "mantenimiento",
    },
    {
      id: 4,
      codigo: "REF-004",
      nombre: "Refrigerador Bodega",
      ubicacion: "Bodega",
      temperatura: "--",
      productos: 0,
      estado: "apagada",
    },
  ]);

  const refrigeradoresFiltrados = useMemo(() => {
    return refrigeradores.filter((refrigerador) => {
      const coincideEstado =
        filtroEstado === "todos" ||
        refrigerador.estado === filtroEstado;

      const texto = busqueda.toLowerCase();

      const coincideBusqueda =
        refrigerador.nombre.toLowerCase().includes(texto) ||
        refrigerador.codigo.toLowerCase().includes(texto) ||
        refrigerador.ubicacion.toLowerCase().includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [refrigeradores, busqueda, filtroEstado]);

  const activos = refrigeradores.filter(
    (refrigerador) => refrigerador.estado === "activa"
  ).length;

  const mantenimiento = refrigeradores.filter(
    (refrigerador) =>
      refrigerador.estado === "mantenimiento"
  ).length;

  const apagados = refrigeradores.filter(
    (refrigerador) => refrigerador.estado === "apagada"
  ).length;

  function nombreEstado(estado) {
    if (estado === "activa") return "Activa";
    if (estado === "mantenimiento") return "Mantenimiento";
    if (estado === "apagada") return "Apagada";

    return estado;
  }

  function cambiarEstado(id, nuevoEstado) {
    setRefrigeradores((actuales) =>
      actuales.map((refrigerador) =>
        refrigerador.id === id
          ? {
              ...refrigerador,
              estado: nuevoEstado,
              temperatura:
                nuevoEstado === "apagada"
                  ? "--"
                  : refrigerador.temperatura === "--"
                    ? "4 °C"
                    : refrigerador.temperatura,
            }
          : refrigerador
      )
    );

    setRefrigeradorSeleccionado((actual) =>
      actual && actual.id === id
        ? {
            ...actual,
            estado: nuevoEstado,
            temperatura:
              nuevoEstado === "apagada"
                ? "--"
                : actual.temperatura === "--"
                  ? "4 °C"
                  : actual.temperatura,
          }
        : actual
    );
  }

  function cerrarDetalle() {
    setRefrigeradorSeleccionado(null);
  }

  return (
    <div className="refrigeradores-section">

      {/* =========================
          KPIs
      ========================= */}

      <section className="refrigeradores-kpis">

        <button
          type="button"
          className={`refrigerador-kpi ${
            filtroEstado === "todos" ? "selected" : ""
          }`}
          onClick={() => setFiltroEstado("todos")}
        >
          <div className="refrigerador-kpi-icon total">
            <Refrigerator
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Total
          </span>

          <strong>
            {refrigeradores.length}
          </strong>

          <small>
            Equipos registrados
          </small>
        </button>

        <button
          type="button"
          className={`refrigerador-kpi ${
            filtroEstado === "activa" ? "selected" : ""
          }`}
          onClick={() => setFiltroEstado("activa")}
        >
          <div className="refrigerador-kpi-icon success">
            <CircleCheck
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Activas
          </span>

          <strong>
            {activos}
          </strong>

          <small className="refrigerador-success">
            Operando normalmente
          </small>
        </button>

        <button
          type="button"
          className={`refrigerador-kpi ${
            filtroEstado === "mantenimiento"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            setFiltroEstado("mantenimiento")
          }
        >
          <div className="refrigerador-kpi-icon warning">
            <Wrench
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Mantenimiento
          </span>

          <strong>
            {mantenimiento}
          </strong>

          <small className="refrigerador-warning">
            Requieren revisión
          </small>
        </button>

        <button
          type="button"
          className={`refrigerador-kpi ${
            filtroEstado === "apagada" ? "selected" : ""
          }`}
          onClick={() => setFiltroEstado("apagada")}
        >
          <div className="refrigerador-kpi-icon inactive">
            <Power
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Apagadas
          </span>

          <strong>
            {apagados}
          </strong>

          <small>
            Fuera de operación
          </small>
        </button>

      </section>

      {/* =========================
          FILTROS
      ========================= */}

      <section className="refrigeradores-toolbar">

        <div className="refrigeradores-filters">

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "todos" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("todos")}
          >
            Todas
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "activa" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("activa")}
          >
            Activas
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "mantenimiento"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFiltroEstado("mantenimiento")
            }
          >
            Mantenimiento
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "apagada" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("apagada")}
          >
            Apagadas
          </button>

        </div>

        <div className="refrigeradores-search">

          <Search
            className="refrigeradores-search-icon"
            size={18}
            strokeWidth={1.9}
          />

          <input
            type="text"
            placeholder="Buscar refrigerador..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />

        </div>

      </section>

      {/* =========================
          TARJETAS
      ========================= */}

      <section className="refrigeradores-grid">

        {refrigeradoresFiltrados.map((refrigerador) => (

          <article
            key={refrigerador.id}
            className={`refrigerador-card ${refrigerador.estado}`}
          >

            <div className="refrigerador-card-header">

              <div className="refrigerador-icon">
                <Snowflake
                  size={21}
                  strokeWidth={1.9}
                />
              </div>

              <span
                className={`refrigerador-status ${refrigerador.estado}`}
              >
                {nombreEstado(refrigerador.estado)}
              </span>

            </div>

            <div className="refrigerador-card-body">

              <span className="refrigerador-code">
                {refrigerador.codigo}
              </span>

              <h3>
                {refrigerador.nombre}
              </h3>

              <p className="refrigerador-location">
                <MapPin
                  size={14}
                  strokeWidth={1.9}
                />

                {refrigerador.ubicacion}
              </p>

              <div className="refrigerador-info-grid">

                <div>
                  <span>
                    Temperatura
                  </span>

                  <strong>
                    <Thermometer
                      size={15}
                      strokeWidth={1.9}
                    />

                    {refrigerador.temperatura}
                  </strong>
                </div>

                <div>
                  <span>
                    Productos
                  </span>

                  <strong>
                    <Package
                      size={15}
                      strokeWidth={1.9}
                    />

                    {refrigerador.productos}
                  </strong>
                </div>

              </div>

            </div>

            <button
              type="button"
              className="refrigerador-detail-button"
              onClick={() =>
                setRefrigeradorSeleccionado(refrigerador)
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

      </section>

      {/* =========================
          DRAWER
      ========================= */}

      {refrigeradorSeleccionado && (
        <>

          <div
            className="refrigerador-overlay"
            onClick={cerrarDetalle}
          ></div>

          <aside className="refrigerador-drawer">

            <div className="refrigerador-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DEL REFRIGERADOR
                </p>

                <h2>
                  {refrigeradorSeleccionado.nombre}
                </h2>

                <span>
                  {refrigeradorSeleccionado.codigo}
                </span>
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
              className={`refrigerador-drawer-status ${refrigeradorSeleccionado.estado}`}
            >
              <span>
                Estado actual
              </span>

              <strong>
                {nombreEstado(
                  refrigeradorSeleccionado.estado
                )}
              </strong>
            </div>

            <div className="refrigerador-detail-grid">

              <div>
                <span>
                  Ubicación
                </span>

                <strong>
                  {refrigeradorSeleccionado.ubicacion}
                </strong>
              </div>

              <div>
                <span>
                  Temperatura
                </span>

                <strong>
                  {refrigeradorSeleccionado.temperatura}
                </strong>
              </div>

              <div>
                <span>
                  Productos asociados
                </span>

                <strong>
                  {refrigeradorSeleccionado.productos}
                </strong>
              </div>

              <div>
                <span>
                  Identificador
                </span>

                <strong>
                  {refrigeradorSeleccionado.codigo}
                </strong>
              </div>

            </div>

            <div className="refrigerador-products">

              <h3>
                Productos almacenados
              </h3>

              {refrigeradorSeleccionado.productos > 0 ? (
                <>
                  <div className="refrigerador-product-row">
                    <span>
                      Poker 330ml
                    </span>

                    <strong>
                      12 unidades
                    </strong>
                  </div>

                  <div className="refrigerador-product-row">
                    <span>
                      Club Colombia
                    </span>

                    <strong>
                      8 unidades
                    </strong>
                  </div>

                  <div className="refrigerador-product-row">
                    <span>
                      Coca-Cola 400ml
                    </span>

                    <strong>
                      8 unidades
                    </strong>
                  </div>
                </>
              ) : (
                <p className="refrigerador-empty-products">
                  No hay productos asociados actualmente.
                </p>
              )}

            </div>

            <div className="refrigerador-state-actions">

              <p>
                Cambiar estado
              </p>

              <button
                type="button"
                className={
                  refrigeradorSeleccionado.estado === "activa"
                    ? "state-button active"
                    : "state-button"
                }
                onClick={() =>
                  cambiarEstado(
                    refrigeradorSeleccionado.id,
                    "activa"
                  )
                }
              >
                <CircleCheck
                  size={16}
                  strokeWidth={1.9}
                />

                Activa
              </button>

              <button
                type="button"
                className={
                  refrigeradorSeleccionado.estado ===
                  "mantenimiento"
                    ? "state-button active"
                    : "state-button"
                }
                onClick={() =>
                  cambiarEstado(
                    refrigeradorSeleccionado.id,
                    "mantenimiento"
                  )
                }
              >
                <Wrench
                  size={16}
                  strokeWidth={1.9}
                />

                Mantenimiento
              </button>

              <button
                type="button"
                className={
                  refrigeradorSeleccionado.estado === "apagada"
                    ? "state-button active"
                    : "state-button"
                }
                onClick={() =>
                  cambiarEstado(
                    refrigeradorSeleccionado.id,
                    "apagada"
                  )
                }
              >
                <Power
                  size={16}
                  strokeWidth={1.9}
                />

                Apagada
              </button>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default RefrigeradoresSection;