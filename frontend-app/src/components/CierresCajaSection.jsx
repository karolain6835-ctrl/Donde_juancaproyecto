import { useMemo, useState } from "react";

import {
  Search,
  ClipboardCheck,
  CircleCheck,
  TriangleAlert,
  Clock3,
  UserRound,
  CircleDollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calculator,
  ArrowRight,
  X,
  LockKeyhole,
  CalendarDays,
} from "lucide-react";

import "./CierresCajaSection.css";

function CierresCajaSection() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [cierreSeleccionado, setCierreSeleccionado] = useState(null);

  const cierres = [
    {
      id: "CJ-041",
      fecha: "01/10/2026",
      responsable: "Karol",
      saldoInicial: 300000,
      entradas: 2210000,
      salidas: 160000,
      esperado: 2350000,
      contado: 2350000,
      diferencia: 0,
      estado: "cuadrado",
      observacion: "Cierre sin novedades.",
    },
    {
      id: "CJ-040",
      fecha: "30/09/2026",
      responsable: "Carlos",
      saldoInicial: 300000,
      entradas: 1980000,
      salidas: 210000,
      esperado: 2070000,
      contado: 2055000,
      diferencia: -15000,
      estado: "diferencia",
      observacion: "Se registró faltante pendiente de revisión.",
    },
    {
      id: "CJ-039",
      fecha: "29/09/2026",
      responsable: "Daniela",
      saldoInicial: 300000,
      entradas: 1740000,
      salidas: 120000,
      esperado: 1920000,
      contado: null,
      diferencia: null,
      estado: "pendiente",
      observacion: "Pendiente conteo físico y revisión.",
    },
  ];

  const cierresFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return cierres.filter((cierre) => {
      const coincideEstado =
        filtroEstado === "todos" ||
        cierre.estado === filtroEstado;

      const coincideBusqueda =
        cierre.id.toLowerCase().includes(texto) ||
        cierre.fecha.toLowerCase().includes(texto) ||
        cierre.responsable.toLowerCase().includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [busqueda, filtroEstado]);

  function formatearDinero(valor) {
    if (valor === null || valor === undefined) {
      return "Pendiente";
    }

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function nombreEstado(estado) {
    if (estado === "cuadrado") return "Cuadrado";
    if (estado === "diferencia") return "Con diferencia";
    if (estado === "pendiente") return "Pendiente revisión";

    return estado;
  }

  return (
    <div className="cierres-caja-section">

      <section className="cierres-toolbar">

        <div className="cierres-filters">

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
              filtroEstado === "cuadrado" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("cuadrado")}
          >
            <CircleCheck size={14} strokeWidth={1.9} />
            Cuadrados
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "diferencia" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("diferencia")}
          >
            <TriangleAlert size={14} strokeWidth={1.9} />
            Con diferencia
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroEstado === "pendiente" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("pendiente")}
          >
            <Clock3 size={14} strokeWidth={1.9} />
            Pendientes
          </button>

        </div>

        <div className="cierres-search">

          <Search
            className="cierres-search-icon"
            size={18}
            strokeWidth={1.9}
          />

          <input
            type="text"
            placeholder="Buscar cierre..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />

        </div>

      </section>

      <section className="cierres-kpis">

        <article className="cierre-kpi">

          <div className="cierre-kpi-icon total">
            <ClipboardCheck size={20} strokeWidth={1.9} />
          </div>

          <span>
            Cierres registrados
          </span>

          <strong>
            {cierres.length}
          </strong>

          <small>
            Historial disponible
          </small>

        </article>

        <article className="cierre-kpi">

          <div className="cierre-kpi-icon ok">
            <CircleCheck size={20} strokeWidth={1.9} />
          </div>

          <span>
            Cuadrados
          </span>

          <strong>
            {
              cierres.filter(
                (cierre) => cierre.estado === "cuadrado"
              ).length
            }
          </strong>

          <small>
            Sin diferencias
          </small>

        </article>

        <article className="cierre-kpi">

          <div className="cierre-kpi-icon difference">
            <TriangleAlert size={20} strokeWidth={1.9} />
          </div>

          <span>
            Con diferencia
          </span>

          <strong>
            {
              cierres.filter(
                (cierre) => cierre.estado === "diferencia"
              ).length
            }
          </strong>

          <small>
            Requieren revisión
          </small>

        </article>

        <article className="cierre-kpi">

          <div className="cierre-kpi-icon pending">
            <Clock3 size={20} strokeWidth={1.9} />
          </div>

          <span>
            Pendientes
          </span>

          <strong>
            {
              cierres.filter(
                (cierre) => cierre.estado === "pendiente"
              ).length
            }
          </strong>

          <small>
            Sin finalizar
          </small>

        </article>

      </section>

      <section className="cierres-panel">

        <div className="cierres-panel-header">

          <div className="cierres-panel-title">

            <div className="cierres-panel-icon">
              <ClipboardCheck size={18} strokeWidth={1.9} />
            </div>

            <div>
              <h2>
                Historial de cierres
              </h2>

              <p>
                {cierresFiltrados.length} registros encontrados
              </p>
            </div>

          </div>

          <span className="cierres-readonly">
            <LockKeyhole size={13} strokeWidth={1.9} />
            Registro de auditoría
          </span>

        </div>

        <div className="cierres-table-wrapper">

          <table className="cierres-table">

            <thead>
              <tr>
                <th>Cierre</th>
                <th>Fecha</th>
                <th>Responsable</th>
                <th>Esperado</th>
                <th>Contado</th>
                <th>Diferencia</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {cierresFiltrados.map((cierre) => (

                <tr key={cierre.id}>

                  <td>
                    <span className="cierre-code">
                      {cierre.id}
                    </span>
                  </td>

                  <td>
                    {cierre.fecha}
                  </td>

                  <td>
                    {cierre.responsable}
                  </td>

                  <td>
                    {formatearDinero(cierre.esperado)}
                  </td>

                  <td>
                    {formatearDinero(cierre.contado)}
                  </td>

                  <td>
                    <strong
                      className={
                        cierre.diferencia === 0
                          ? "cierre-difference-ok"
                          : cierre.diferencia
                          ? "cierre-difference-alert"
                          : ""
                      }
                    >
                      {formatearDinero(cierre.diferencia)}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={`cierre-status ${cierre.estado}`}
                    >
                      {nombreEstado(cierre.estado)}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="cierre-detail-button"
                      onClick={() =>
                        setCierreSeleccionado(cierre)
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

      {cierreSeleccionado && (
        <>

          <div
            className="cierre-overlay"
            onClick={() =>
              setCierreSeleccionado(null)
            }
          ></div>

          <aside className="cierre-drawer">

            <div className="cierre-drawer-header">

              <div>
                <p className="page-eyebrow">
                  CIERRE DE CAJA
                </p>

                <h2>
                  {cierreSeleccionado.id}
                </h2>

                <span>
                  {cierreSeleccionado.fecha}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setCierreSeleccionado(null)
                }
                aria-label="Cerrar detalle"
              >
                <X size={20} strokeWidth={1.9} />
              </button>

            </div>

            <div
              className={`cierre-status-box ${cierreSeleccionado.estado}`}
            >

              <span>
                Estado
              </span>

              <strong>
                {nombreEstado(
                  cierreSeleccionado.estado
                )}
              </strong>

            </div>

            <div className="cierre-detail-grid">

              <div>
                <span>
                  Responsable
                </span>

                <strong>
                  <UserRound size={14} strokeWidth={1.9} />
                  {cierreSeleccionado.responsable}
                </strong>
              </div>

              <div>
                <span>
                  Saldo inicial
                </span>

                <strong>
                  <CircleDollarSign size={14} strokeWidth={1.9} />
                  {formatearDinero(
                    cierreSeleccionado.saldoInicial
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Entradas
                </span>

                <strong className="cierre-entry">
                  <ArrowDownToLine size={14} strokeWidth={1.9} />
                  {formatearDinero(
                    cierreSeleccionado.entradas
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Salidas
                </span>

                <strong className="cierre-exit">
                  <ArrowUpFromLine size={14} strokeWidth={1.9} />
                  {formatearDinero(
                    cierreSeleccionado.salidas
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Saldo esperado
                </span>

                <strong>
                  <Calculator size={14} strokeWidth={1.9} />
                  {formatearDinero(
                    cierreSeleccionado.esperado
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Conteo físico
                </span>

                <strong>
                  <CircleDollarSign size={14} strokeWidth={1.9} />
                  {formatearDinero(
                    cierreSeleccionado.contado
                  )}
                </strong>
              </div>

            </div>

            <div
              className={`cierre-difference-box ${
                cierreSeleccionado.diferencia === 0
                  ? "ok"
                  : cierreSeleccionado.diferencia
                  ? "alert"
                  : "pending"
              }`}
            >

              <span>
                Diferencia
              </span>

              <strong>
                {formatearDinero(
                  cierreSeleccionado.diferencia
                )}
              </strong>

            </div>

            <div className="cierre-observation">

              <span>
                Observación
              </span>

              <p>
                {cierreSeleccionado.observacion}
              </p>

            </div>

            <div className="cierre-readonly">

              <LockKeyhole
                size={17}
                strokeWidth={1.9}
              />

              <span>
                Los cierres confirmados forman parte del historial de caja y deben conservarse como registros de auditoría.
              </span>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default CierresCajaSection;