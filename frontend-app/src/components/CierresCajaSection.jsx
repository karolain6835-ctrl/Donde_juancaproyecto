import { useMemo, useState } from "react";
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
            className={`filter-button ${
              filtroEstado === "todos" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("todos")}
          >
            Todos
          </button>

          <button
            className={`filter-button ${
              filtroEstado === "cuadrado" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("cuadrado")}
          >
            Cuadrados
          </button>

          <button
            className={`filter-button ${
              filtroEstado === "diferencia" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("diferencia")}
          >
            Con diferencia
          </button>

          <button
            className={`filter-button ${
              filtroEstado === "pendiente" ? "active" : ""
            }`}
            onClick={() => setFiltroEstado("pendiente")}
          >
            Pendientes
          </button>

        </div>

        <div className="cierres-search">
          <input
            type="text"
            placeholder="Buscar cierre..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </div>

      </section>

      <section className="cierres-kpis">

        <article className="cierre-kpi">
          <span>Cierres registrados</span>
          <strong>{cierres.length}</strong>
          <small>Historial disponible</small>
        </article>

        <article className="cierre-kpi">
          <span>Cuadrados</span>
          <strong>
            {
              cierres.filter(
                (cierre) => cierre.estado === "cuadrado"
              ).length
            }
          </strong>
          <small>Sin diferencias</small>
        </article>

        <article className="cierre-kpi">
          <span>Con diferencia</span>
          <strong>
            {
              cierres.filter(
                (cierre) => cierre.estado === "diferencia"
              ).length
            }
          </strong>
          <small>Requieren revisión</small>
        </article>

        <article className="cierre-kpi">
          <span>Pendientes</span>
          <strong>
            {
              cierres.filter(
                (cierre) => cierre.estado === "pendiente"
              ).length
            }
          </strong>
          <small>Sin finalizar</small>
        </article>

      </section>

      <section className="cierres-panel">

        <div className="cierres-panel-header">
          <div>
            <h2>Historial de cierres</h2>

            <p>
              {cierresFiltrados.length} registros encontrados
            </p>
          </div>
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
                    <strong>{cierre.id}</strong>
                  </td>

                  <td>{cierre.fecha}</td>

                  <td>{cierre.responsable}</td>

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
                      className="cierre-detail-button"
                      onClick={() =>
                        setCierreSeleccionado(cierre)
                      }
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

      {cierreSeleccionado && (
        <>
          <div
            className="cierre-overlay"
            onClick={() => setCierreSeleccionado(null)}
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
                className="drawer-close"
                onClick={() =>
                  setCierreSeleccionado(null)
                }
              >
                ×
              </button>

            </div>

            <div className="cierre-status-box">

              <span>Estado</span>

              <strong>
                {nombreEstado(
                  cierreSeleccionado.estado
                )}
              </strong>

            </div>

            <div className="cierre-detail-grid">

              <div>
                <span>Responsable</span>
                <strong>
                  {cierreSeleccionado.responsable}
                </strong>
              </div>

              <div>
                <span>Saldo inicial</span>
                <strong>
                  {formatearDinero(
                    cierreSeleccionado.saldoInicial
                  )}
                </strong>
              </div>

              <div>
                <span>Entradas</span>
                <strong>
                  {formatearDinero(
                    cierreSeleccionado.entradas
                  )}
                </strong>
              </div>

              <div>
                <span>Salidas</span>
                <strong>
                  {formatearDinero(
                    cierreSeleccionado.salidas
                  )}
                </strong>
              </div>

              <div>
                <span>Saldo esperado</span>
                <strong>
                  {formatearDinero(
                    cierreSeleccionado.esperado
                  )}
                </strong>
              </div>

              <div>
                <span>Conteo físico</span>
                <strong>
                  {formatearDinero(
                    cierreSeleccionado.contado
                  )}
                </strong>
              </div>

            </div>

            <div className="cierre-difference-box">

              <span>Diferencia</span>

              <strong>
                {formatearDinero(
                  cierreSeleccionado.diferencia
                )}
              </strong>

            </div>

            <div className="cierre-observation">

              <span>Observación</span>

              <p>
                {cierreSeleccionado.observacion}
              </p>

            </div>

            <div className="cierre-readonly">
              Los cierres confirmados forman parte del historial de caja y
              deben conservarse como registros de auditoría.
            </div>

          </aside>
        </>
      )}

    </div>
  );
}

export default CierresCajaSection;