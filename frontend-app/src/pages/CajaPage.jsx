import { useMemo, useState } from "react";
import CuentasPendientesSection from "../components/CuentasPendientesSection";
import CierresCajaSection from "../components/CierresCajaSection";
import "./CajaPage.css";

function CajaPage() {
  const [seccionActiva, setSeccionActiva] = useState("pagos");
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState(null);
  const [mostrarCierre, setMostrarCierre] = useState(false);

  const pagos = [
    {
      id: "PG-901",
      hora: "15:42",
      mesa: "Mesa 4",
      pedido: "P-3842",
      metodo: "Nequi",
      valor: 86000,
      usuario: "Laura",
    },
    {
      id: "PG-900",
      hora: "15:18",
      mesa: "Mesa 8",
      pedido: "P-3847",
      metodo: "Efectivo",
      valor: 38000,
      usuario: "Daniela",
    },
    {
      id: "PG-899",
      hora: "14:55",
      mesa: "Mesa 2",
      pedido: "P-3845",
      metodo: "Tarjeta",
      valor: 54000,
      usuario: "Carlos",
    },
    {
      id: "PG-898",
      hora: "14:30",
      mesa: "Mesa 6",
      pedido: "P-3839",
      metodo: "Daviplata",
      valor: 112000,
      usuario: "Laura",
    },
  ];

  const resumenMetodos = useMemo(() => {
    const resumen = {};

    pagos.forEach((pago) => {
      resumen[pago.metodo] =
        (resumen[pago.metodo] || 0) + pago.valor;
    });

    return resumen;
  }, [pagos]);

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  const saldoInicial = 300000;
  const entradas = 2436000;
  const salidas = 185000;
  const saldoEsperado = saldoInicial + entradas - salidas;

  return (
    <div className="caja-page">

      <header className="caja-header">
        <div>
          <p className="page-eyebrow">CAJA Y PAGOS</p>

          <h1 className="page-title">
            {seccionActiva === "pagos" && "Pagos y caja"}
            {seccionActiva === "pendientes" && "Cuentas pendientes"}
            {seccionActiva === "cierres" && "Cierres de caja"}
          </h1>

          <p className="page-description">
            Controla pagos, cuentas abiertas y cierres de caja.
          </p>
        </div>
      </header>

      <nav className="caja-nav">

        <button
          className={seccionActiva === "pagos" ? "active" : ""}
          onClick={() => setSeccionActiva("pagos")}
        >
          Pagos
        </button>

        <button
          className={seccionActiva === "pendientes" ? "active" : ""}
          onClick={() => setSeccionActiva("pendientes")}
        >
          Cuentas pendientes
        </button>

        <button
          className={seccionActiva === "cierres" ? "active" : ""}
          onClick={() => setSeccionActiva("cierres")}
        >
          Cierres de caja
        </button>

      </nav>

      {seccionActiva === "pagos" && (
        <>
          <section className="caja-status-panel">

            <div className="caja-status-main">

              <div>
                <span>Estado de caja</span>
                <strong>Abierta</strong>
                <small>Desde las 08:02</small>
              </div>

              <div className="caja-status-badge">
                Caja abierta
              </div>

            </div>

            <div className="caja-balance">
              <span>Saldo esperado</span>
              <strong>{formatearDinero(saldoEsperado)}</strong>
            </div>

          </section>

          <section className="caja-kpis">

            <article className="caja-kpi">
              <span>Saldo inicial</span>
              <strong>{formatearDinero(saldoInicial)}</strong>
              <small>Apertura del turno</small>
            </article>

            <article className="caja-kpi">
              <span>Entradas</span>
              <strong>{formatearDinero(entradas)}</strong>
              <small className="caja-positive">
                Pagos registrados
              </small>
            </article>

            <article className="caja-kpi">
              <span>Salidas</span>
              <strong>{formatearDinero(salidas)}</strong>
              <small className="caja-negative">
                Gastos y retiros
              </small>
            </article>

            <article className="caja-kpi">
              <span>Movimientos</span>
              <strong>{pagos.length}</strong>
              <small>Pagos recientes</small>
            </article>

          </section>

          <section className="caja-main-grid">

            <article className="caja-panel">

              <div className="caja-panel-header">
                <div>
                  <h2>Métodos de pago</h2>
                  <p>Distribución de ingresos registrados</p>
                </div>
              </div>

              <div className="payment-methods">

                {Object.entries(resumenMetodos).map(
                  ([metodo, valor]) => (
                    <div
                      key={metodo}
                      className="payment-method-row"
                    >
                      <span>{metodo}</span>
                      <strong>
                        {formatearDinero(valor)}
                      </strong>
                    </div>
                  )
                )}

              </div>

            </article>

            <article className="caja-panel caja-actions-panel">

              <div className="caja-panel-header">
                <div>
                  <h2>Control de caja</h2>
                  <p>Acciones del turno actual</p>
                </div>
              </div>

              <button
                className="caja-review-button"
                onClick={() => setMostrarCierre(true)}
              >
                Revisar cierre
              </button>

              <button
                className="caja-close-button"
                onClick={() => setMostrarCierre(true)}
              >
                Cerrar caja
              </button>

            </article>

          </section>

          <section className="caja-panel caja-movements">

            <div className="caja-panel-header">
              <div>
                <h2>Pagos recientes</h2>
                <p>Últimos movimientos registrados</p>
              </div>
            </div>

            <div className="caja-table-wrapper">

              <table className="caja-table">

                <thead>
                  <tr>
                    <th>Pago</th>
                    <th>Hora</th>
                    <th>Mesa</th>
                    <th>Pedido</th>
                    <th>Método</th>
                    <th>Valor</th>
                    <th>Usuario</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>

                  {pagos.map((pago) => (
                    <tr key={pago.id}>
                      <td><strong>{pago.id}</strong></td>
                      <td>{pago.hora}</td>
                      <td>{pago.mesa}</td>
                      <td>{pago.pedido}</td>
                      <td>
                        <span className="payment-chip">
                          {pago.metodo}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {formatearDinero(pago.valor)}
                        </strong>
                      </td>
                      <td>{pago.usuario}</td>
                      <td>
                        <button
                          className="caja-detail-button"
                          onClick={() =>
                            setMovimientoSeleccionado(pago)
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
        </>
      )}

      {seccionActiva === "pendientes" && (
  <CuentasPendientesSection />
)}

{seccionActiva === "cierres" && (
  <CierresCajaSection />
)}

      {movimientoSeleccionado && (
        <>
          <div
            className="caja-overlay"
            onClick={() => setMovimientoSeleccionado(null)}
          ></div>

          <aside className="caja-drawer">

            <div className="caja-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DEL PAGO
                </p>

                <h2>
                  {movimientoSeleccionado.id}
                </h2>
              </div>

              <button
                className="drawer-close"
                onClick={() => setMovimientoSeleccionado(null)}
              >
                ×
              </button>

            </div>

            <div className="caja-detail-grid">

              <div>
                <span>Mesa</span>
                <strong>
                  {movimientoSeleccionado.mesa}
                </strong>
              </div>

              <div>
                <span>Pedido</span>
                <strong>
                  {movimientoSeleccionado.pedido}
                </strong>
              </div>

              <div>
                <span>Método</span>
                <strong>
                  {movimientoSeleccionado.metodo}
                </strong>
              </div>

              <div>
                <span>Hora</span>
                <strong>
                  {movimientoSeleccionado.hora}
                </strong>
              </div>

              <div>
                <span>Responsable</span>
                <strong>
                  {movimientoSeleccionado.usuario}
                </strong>
              </div>

              <div>
                <span>Valor</span>
                <strong>
                  {formatearDinero(
                    movimientoSeleccionado.valor
                  )}
                </strong>
              </div>

            </div>

          </aside>
        </>
      )}

      {mostrarCierre && (
        <>
          <div
            className="caja-overlay"
            onClick={() => setMostrarCierre(false)}
          ></div>

          <aside className="caja-drawer">

            <div className="caja-drawer-header">

              <div>
                <p className="page-eyebrow">
                  CIERRE DE CAJA
                </p>

                <h2>
                  Revisión del turno
                </h2>
              </div>

              <button
                className="drawer-close"
                onClick={() => setMostrarCierre(false)}
              >
                ×
              </button>

            </div>

            <div className="caja-detail-grid">

              <div>
                <span>Saldo inicial</span>
                <strong>
                  {formatearDinero(saldoInicial)}
                </strong>
              </div>

              <div>
                <span>Entradas</span>
                <strong>
                  {formatearDinero(entradas)}
                </strong>
              </div>

              <div>
                <span>Salidas</span>
                <strong>
                  {formatearDinero(salidas)}
                </strong>
              </div>

              <div>
                <span>Saldo esperado</span>
                <strong>
                  {formatearDinero(saldoEsperado)}
                </strong>
              </div>

            </div>

            <div className="cash-count-box">

              <label>
                Conteo físico
                <input
                  type="number"
                  placeholder="Ingresa el valor contado"
                />
              </label>

            </div>

            <div className="caja-close-notice">
              Antes de cerrar la caja se debe comparar el conteo físico con
              el saldo esperado y registrar cualquier diferencia.
            </div>

            <button className="drawer-primary-button">
              Confirmar cierre
            </button>

          </aside>
        </>
      )}

    </div>
  );
}

export default CajaPage;