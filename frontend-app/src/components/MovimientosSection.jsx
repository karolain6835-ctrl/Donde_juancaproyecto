import { useMemo, useState } from "react";

import {
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  SlidersHorizontal,
  ArrowRight,
  X,
  Clock3,
  CalendarDays,
  UserRound,
  Package,
  LockKeyhole,
} from "lucide-react";

import "./MovimientosSection.css";

function MovimientosSection() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [
    movimientoSeleccionado,
    setMovimientoSeleccionado,
  ] = useState(null);

  const movimientos = [
    {
      id: 1,
      referencia: "MOV-1001",
      producto: "Poker 330ml",
      codigo: "BEB-001",
      tipo: "venta",
      cantidad: -4,
      usuario: "Laura",
      fecha: "02/10/2026",
      hora: "10:42",
      origen: "Pedido P-3842",
      observacion:
        "Salida automática por venta registrada.",
    },
    {
      id: 2,
      referencia: "MOV-1002",
      producto: "Aguardiente Antioqueño",
      codigo: "LIC-001",
      tipo: "compra",
      cantidad: 12,
      usuario: "Karol",
      fecha: "02/10/2026",
      hora: "09:30",
      origen: "Compra OC-209",
      observacion:
        "Ingreso de inventario por recepción de compra.",
    },
    {
      id: 3,
      referencia: "MOV-1003",
      producto: "Papas a la francesa",
      codigo: "COM-001",
      tipo: "merma",
      cantidad: -3,
      usuario: "Carlos",
      fecha: "01/10/2026",
      hora: "21:18",
      origen: "Merma MER-042",
      observacion:
        "Producto descartado por pérdida operativa.",
    },
    {
      id: 4,
      referencia: "MOV-1004",
      producto: "Club Colombia",
      codigo: "BEB-002",
      tipo: "ajuste",
      cantidad: 2,
      usuario: "Karol",
      fecha: "01/10/2026",
      hora: "18:05",
      origen: "Ajuste manual",
      observacion:
        "Corrección después de conteo físico.",
    },
    {
      id: 5,
      referencia: "MOV-1005",
      producto: "Coca-Cola 400ml",
      codigo: "GAS-001",
      tipo: "venta",
      cantidad: -2,
      usuario: "Daniela",
      fecha: "01/10/2026",
      hora: "17:44",
      origen: "Pedido P-3838",
      observacion:
        "Salida automática por venta registrada.",
    },
  ];

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((movimiento) => {
      const coincideTipo =
        filtroTipo === "todos" ||
        movimiento.tipo === filtroTipo;

      const texto = busqueda.toLowerCase();

      const coincideBusqueda =
        movimiento.producto.toLowerCase().includes(texto) ||
        movimiento.codigo.toLowerCase().includes(texto) ||
        movimiento.referencia.toLowerCase().includes(texto) ||
        movimiento.usuario.toLowerCase().includes(texto);

      return coincideTipo && coincideBusqueda;
    });
  }, [busqueda, filtroTipo]);

  function nombreTipo(tipo) {
    if (tipo === "compra") return "Compra";
    if (tipo === "venta") return "Venta";
    if (tipo === "merma") return "Merma";
    if (tipo === "ajuste") return "Ajuste";

    return tipo;
  }

  function cerrarDetalle() {
    setMovimientoSeleccionado(null);
  }

  function iconoTipo(tipo) {
    if (tipo === "compra") {
      return (
        <ArrowDownToLine
          size={14}
          strokeWidth={1.9}
        />
      );
    }

    if (tipo === "venta") {
      return (
        <ArrowUpFromLine
          size={14}
          strokeWidth={1.9}
        />
      );
    }

    if (tipo === "merma") {
      return (
        <Trash2
          size={14}
          strokeWidth={1.9}
        />
      );
    }

    if (tipo === "ajuste") {
      return (
        <SlidersHorizontal
          size={14}
          strokeWidth={1.9}
        />
      );
    }

    return null;
  }

  return (
    <div className="movimientos-section">

      {/* =========================
          FILTROS
      ========================= */}

      <section className="movimientos-toolbar">

        <div className="movimientos-filters">

          <button
            type="button"
            className={`filter-button ${
              filtroTipo === "todos" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("todos")}
          >
            Todos
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroTipo === "compra" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("compra")}
          >
            Compras
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroTipo === "venta" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("venta")}
          >
            Ventas
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroTipo === "merma" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("merma")}
          >
            Mermas
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroTipo === "ajuste" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("ajuste")}
          >
            Ajustes
          </button>

        </div>

        <div className="movimientos-search">

          <Search
            className="movimientos-search-icon"
            size={18}
            strokeWidth={1.9}
          />

          <input
            type="text"
            placeholder="Buscar movimiento..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />

        </div>

      </section>

      {/* =========================
          HISTORIAL
      ========================= */}

      <section className="movimientos-panel">

        <div className="movimientos-panel-header">

          <div>
            <h2>
              Historial de movimientos
            </h2>

            <p>
              {movimientosFiltrados.length} movimientos encontrados
            </p>
          </div>

          <span className="movimientos-readonly">
            <LockKeyhole
              size={13}
              strokeWidth={1.9}
            />

            Historial de solo consulta
          </span>

        </div>

        <div className="movimientos-table-wrapper">

          <table className="movimientos-table">

            <thead>
              <tr>
                <th>Referencia</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Usuario</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {movimientosFiltrados.map((movimiento) => (
                <tr key={movimiento.id}>

                  <td>
                    <span className="movimiento-reference">
                      {movimiento.referencia}
                    </span>
                  </td>

                  <td>
                    <div className="movimiento-product">

                      <strong>
                        {movimiento.producto}
                      </strong>

                      <span>
                        {movimiento.codigo}
                      </span>

                    </div>
                  </td>

                  <td>
                    <span
                      className={`movimiento-type ${movimiento.tipo}`}
                    >
                      {iconoTipo(movimiento.tipo)}

                      {nombreTipo(movimiento.tipo)}
                    </span>
                  </td>

                  <td>
                    <strong
                      className={
                        movimiento.cantidad > 0
                          ? "cantidad-positive"
                          : "cantidad-negative"
                      }
                    >
                      {movimiento.cantidad > 0 ? "+" : ""}
                      {movimiento.cantidad}
                    </strong>
                  </td>

                  <td>
                    {movimiento.usuario}
                  </td>

                  <td>
                    {movimiento.fecha}
                  </td>

                  <td>
                    {movimiento.hora}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="movimiento-detail-button"
                      onClick={() =>
                        setMovimientoSeleccionado(movimiento)
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

      {movimientoSeleccionado && (
        <>

          <div
            className="movimiento-overlay"
            onClick={cerrarDetalle}
          ></div>

          <aside className="movimiento-drawer">

            <div className="movimiento-drawer-header">

              <div>
                <p className="page-eyebrow">
                  MOVIMIENTO DE INVENTARIO
                </p>

                <h2>
                  {movimientoSeleccionado.referencia}
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
              className={`movimiento-drawer-type ${movimientoSeleccionado.tipo}`}
            >
              <span>
                Tipo de movimiento
              </span>

              <strong>
                {iconoTipo(movimientoSeleccionado.tipo)}

                {nombreTipo(
                  movimientoSeleccionado.tipo
                )}
              </strong>
            </div>

            <div className="movimiento-detail-grid">

              <div>
                <span>
                  Producto
                </span>

                <strong>
                  <Package
                    size={14}
                    strokeWidth={1.9}
                  />

                  {movimientoSeleccionado.producto}
                </strong>
              </div>

              <div>
                <span>
                  Código
                </span>

                <strong>
                  {movimientoSeleccionado.codigo}
                </strong>
              </div>

              <div>
                <span>
                  Cantidad
                </span>

                <strong
                  className={
                    movimientoSeleccionado.cantidad > 0
                      ? "cantidad-positive"
                      : "cantidad-negative"
                  }
                >
                  {movimientoSeleccionado.cantidad > 0
                    ? "+"
                    : ""}
                  {movimientoSeleccionado.cantidad}
                </strong>
              </div>

              <div>
                <span>
                  Usuario
                </span>

                <strong>
                  <UserRound
                    size={14}
                    strokeWidth={1.9}
                  />

                  {movimientoSeleccionado.usuario}
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

                  {movimientoSeleccionado.fecha}
                </strong>
              </div>

              <div>
                <span>
                  Hora
                </span>

                <strong>
                  <Clock3
                    size={14}
                    strokeWidth={1.9}
                  />

                  {movimientoSeleccionado.hora}
                </strong>
              </div>

            </div>

            <div className="movimiento-origin">

              <span>
                Origen
              </span>

              <strong>
                {movimientoSeleccionado.origen}
              </strong>

            </div>

            <div className="movimiento-observation">

              <span>
                Observación
              </span>

              <p>
                {movimientoSeleccionado.observacion}
              </p>

            </div>

            <div className="movimiento-readonly-box">

              <LockKeyhole
                size={16}
                strokeWidth={1.9}
              />

              <span>
                Este registro forma parte del historial de inventario y no puede
                eliminarse desde esta vista.
              </span>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default MovimientosSection;