import { useMemo, useState } from "react";

import {
  WalletCards,
  ReceiptText,
  CircleDollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  ListChecks,
  Banknote,
  CreditCard,
  Smartphone,
  Clock3,
  Armchair,
  UserRound,
  ArrowRight,
  X,
  Calculator,
  CircleCheck,
  ClipboardCheck,
} from "lucide-react";

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

  function iconoMetodo(metodo) {
    if (metodo === "Efectivo") {
      return <Banknote size={17} strokeWidth={1.9} />;
    }

    if (metodo === "Tarjeta") {
      return <CreditCard size={17} strokeWidth={1.9} />;
    }

    return <Smartphone size={17} strokeWidth={1.9} />;
  }

  const saldoInicial = 300000;
  const entradas = 2436000;
  const salidas = 185000;
  const saldoEsperado = saldoInicial + entradas - salidas;

  return (
    <div className="caja-page">

      <header className="caja-header">

        <div>
          <p className="page-eyebrow">
            CAJA Y PAGOS
          </p>

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
          type="button"
          className={seccionActiva === "pagos" ? "active" : ""}
          onClick={() => setSeccionActiva("pagos")}
        >
          <WalletCards size={16} strokeWidth={1.9} />
          Pagos
        </button>

        <button
          type="button"
          className={seccionActiva === "pendientes" ? "active" : ""}
          onClick={() => setSeccionActiva("pendientes")}
        >
          <ReceiptText size={16} strokeWidth={1.9} />
          Cuentas pendientes
        </button>

        <button
          type="button"
          className={seccionActiva === "cierres" ? "active" : ""}
          onClick={() => setSeccionActiva("cierres")}
        >
          <ClipboardCheck size={16} strokeWidth={1.9} />
          Cierres de caja
        </button>

      </nav>

      {seccionActiva === "pagos" && (
        <>

          <section className="caja-status-panel">

            <div className="caja-status-main">

              <div className="caja-status-icon">
                <WalletCards
                  size={25}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <span>
                  Estado de caja
                </span>

                <strong>
                  Abierta
                </strong>

                <small>
                  Desde las 08:02
                </small>
              </div>

              <div className="caja-status-badge">
                <CircleCheck
                  size={14}
                  strokeWidth={1.9}
                />
                Caja abierta
              </div>

            </div>

            <div className="caja-balance">

              <span>
                Saldo esperado
              </span>

              <strong>
                {formatearDinero(saldoEsperado)}
              </strong>

            </div>

          </section>

          <section className="caja-kpis">

            <article className="caja-kpi">

              <div className="caja-kpi-icon initial">
                <CircleDollarSign
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Saldo inicial
              </span>

              <strong>
                {formatearDinero(saldoInicial)}
              </strong>

              <small>
                Apertura del turno
              </small>

            </article>

            <article className="caja-kpi">

              <div className="caja-kpi-icon income">
                <ArrowDownToLine
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Entradas
              </span>

              <strong>
                {formatearDinero(entradas)}
              </strong>

              <small className="caja-positive">
                Pagos registrados
              </small>

            </article>

            <article className="caja-kpi">

              <div className="caja-kpi-icon outcome">
                <ArrowUpFromLine
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Salidas
              </span>

              <strong>
                {formatearDinero(salidas)}
              </strong>

              <small className="caja-negative">
                Gastos y retiros
              </small>

            </article>

            <article className="caja-kpi">

              <div className="caja-kpi-icon movements">
                <ListChecks
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Movimientos
              </span>

              <strong>
                {pagos.length}
              </strong>

              <small>
                Pagos recientes
              </small>

            </article>

          </section>

          <section className="caja-main-grid">

            <article className="caja-panel">

              <div className="caja-panel-header">

                <div>
                  <h2>
                    Métodos de pago
                  </h2>

                  <p>
                    Distribución de ingresos registrados
                  </p>
                </div>

              </div>

              <div className="payment-methods">

                {Object.entries(resumenMetodos).map(
                  ([metodo, valor]) => (

                    <div
                      key={metodo}
                      className="payment-method-row"
                    >

                      <div className="payment-method-name">

                        <span className="payment-method-icon">
                          {iconoMetodo(metodo)}
                        </span>

                        <span>
                          {metodo}
                        </span>

                      </div>

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
                  <h2>
                    Control de caja
                  </h2>

                  <p>
                    Acciones del turno actual
                  </p>
                </div>

              </div>

              <div className="caja-actions-content">

                <div className="caja-control-icon">
                  <Calculator
                    size={23}
                    strokeWidth={1.8}
                  />
                </div>

                <p>
                  Revisa el saldo esperado y realiza el conteo físico antes de cerrar el turno.
                </p>

              </div>

              <button
                type="button"
                className="caja-review-button"
                onClick={() => setMostrarCierre(true)}
              >
                <Calculator
                  size={16}
                  strokeWidth={1.9}
                />

                Revisar cierre
              </button>

              <button
                type="button"
                className="caja-close-button"
                onClick={() => setMostrarCierre(true)}
              >
                <ClipboardCheck
                  size={16}
                  strokeWidth={1.9}
                />

                Cerrar caja
              </button>

            </article>

          </section>

          <section className="caja-panel caja-movements">

            <div className="caja-panel-header">

              <div>
                <h2>
                  Pagos recientes
                </h2>

                <p>
                  Últimos movimientos registrados
                </p>
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

                      <td>
                        <span className="caja-payment-code">
                          {pago.id}
                        </span>
                      </td>

                      <td>
                        {pago.hora}
                      </td>

                      <td>
                        {pago.mesa}
                      </td>

                      <td>
                        {pago.pedido}
                      </td>

                      <td>
                        <span className="payment-chip">

                          {iconoMetodo(pago.metodo)}

                          {pago.metodo}

                        </span>
                      </td>

                      <td>
                        <strong>
                          {formatearDinero(pago.valor)}
                        </strong>
                      </td>

                      <td>
                        {pago.usuario}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="caja-detail-button"
                          onClick={() =>
                            setMovimientoSeleccionado(pago)
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
            onClick={() =>
              setMovimientoSeleccionado(null)
            }
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
                type="button"
                className="drawer-close"
                onClick={() =>
                  setMovimientoSeleccionado(null)
                }
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className="caja-detail-grid">

              <div>
                <span>
                  Mesa
                </span>

                <strong>
                  <Armchair
                    size={14}
                    strokeWidth={1.9}
                  />

                  {movimientoSeleccionado.mesa}
                </strong>
              </div>

              <div>
                <span>
                  Pedido
                </span>

                <strong>
                  <ReceiptText
                    size={14}
                    strokeWidth={1.9}
                  />

                  {movimientoSeleccionado.pedido}
                </strong>
              </div>

              <div>
                <span>
                  Método
                </span>

                <strong>
                  {iconoMetodo(
                    movimientoSeleccionado.metodo
                  )}

                  {movimientoSeleccionado.metodo}
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

              <div>
                <span>
                  Responsable
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
                  Valor
                </span>

                <strong>
                  <CircleDollarSign
                    size={14}
                    strokeWidth={1.9}
                  />

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
                type="button"
                className="drawer-close"
                onClick={() => setMostrarCierre(false)}
                aria-label="Cerrar revisión"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className="caja-detail-grid">

              <div>
                <span>
                  Saldo inicial
                </span>

                <strong>
                  <CircleDollarSign
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(saldoInicial)}
                </strong>
              </div>

              <div>
                <span>
                  Entradas
                </span>

                <strong className="caja-positive">
                  <ArrowDownToLine
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(entradas)}
                </strong>
              </div>

              <div>
                <span>
                  Salidas
                </span>

                <strong className="caja-negative">
                  <ArrowUpFromLine
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(salidas)}
                </strong>
              </div>

              <div>
                <span>
                  Saldo esperado
                </span>

                <strong>
                  <Calculator
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(saldoEsperado)}
                </strong>
              </div>

            </div>

            <div className="cash-count-box">

              <label>
                Conteo físico

                <div className="cash-count-input">
                  <CircleDollarSign
                    size={17}
                    strokeWidth={1.9}
                  />

                  <input
                    type="number"
                    placeholder="Ingresa el valor contado"
                  />
                </div>

              </label>

            </div>

            <div className="caja-close-notice">

              <Calculator
                size={17}
                strokeWidth={1.9}
              />

              <span>
                Antes de cerrar la caja se debe comparar el conteo físico con el saldo esperado y registrar cualquier diferencia.
              </span>

            </div>

            <button
              type="button"
              className="drawer-primary-button caja-confirm-close"
            >
              <ClipboardCheck
                size={17}
                strokeWidth={1.9}
              />

              Confirmar cierre
            </button>

          </aside>

        </>
      )}

    </div>
  );
}

export default CajaPage;