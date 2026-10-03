import { useMemo, useState } from "react";
import "./HistorialClientesSection.css";

function HistorialClientesSection() {
  const [busqueda, setBusqueda] = useState("");
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

  const historial = [
    {
      id: 1,
      cliente: "Andrés Gómez",
      pedido: "P-3821",
      mesa: "Mesa 4",
      fecha: "01/10/2026",
      hora: "20:18",
      total: 92000,
      usuario: "Laura",
      productos: [
        "Poker 330ml",
        "Club Colombia",
        "Sesión de billar",
      ],
    },
    {
      id: 2,
      cliente: "María Fernanda Ruiz",
      pedido: "P-3804",
      mesa: "Mesa 7",
      fecha: "30/09/2026",
      hora: "19:42",
      total: 112000,
      usuario: "Carlos",
      productos: [
        "Aguardiente Antioqueño",
        "Coca-Cola 400ml",
        "Sesión de tejo",
      ],
    },
    {
      id: 3,
      cliente: "Juan Pablo López",
      pedido: "P-3798",
      mesa: "Mesa 9",
      fecha: "29/09/2026",
      hora: "21:05",
      total: 86000,
      usuario: "Daniela",
      productos: [
        "Ron Medellín",
        "Hielo",
        "Bolirana",
      ],
    },
    {
      id: 4,
      cliente: "Andrés Gómez",
      pedido: "P-3779",
      mesa: "Mesa 2",
      fecha: "24/09/2026",
      hora: "18:30",
      total: 68000,
      usuario: "Carlos",
      productos: [
        "Poker 330ml",
        "Papas",
      ],
    },
  ];

  const historialFiltrado = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return historial.filter(
      (registro) =>
        registro.cliente.toLowerCase().includes(texto) ||
        registro.pedido.toLowerCase().includes(texto) ||
        registro.mesa.toLowerCase().includes(texto) ||
        registro.usuario.toLowerCase().includes(texto) ||
        registro.fecha.toLowerCase().includes(texto)
    );
  }, [busqueda]);

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  return (
    <div className="historial-clientes-section">

      <section className="historial-clientes-toolbar">

        <div>
          <h2>Consumos registrados</h2>
          <p>
            Consulta las visitas y pedidos asociados a clientes.
          </p>
        </div>

        <div className="historial-clientes-search">
          <input
            type="text"
            placeholder="Buscar cliente, pedido o mesa..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </div>

      </section>

      <section className="historial-clientes-kpis">

        <article className="historial-cliente-kpi">
          <span>Consumos registrados</span>
          <strong>{historial.length}</strong>
          <small>En el historial</small>
        </article>

        <article className="historial-cliente-kpi">
          <span>Clientes distintos</span>
          <strong>
            {new Set(
              historial.map((registro) => registro.cliente)
            ).size}
          </strong>
          <small>Con consumo registrado</small>
        </article>

        <article className="historial-cliente-kpi">
          <span>Ventas asociadas</span>
          <strong>
            {formatearDinero(
              historial.reduce(
                (total, registro) => total + registro.total,
                0
              )
            )}
          </strong>
          <small>Histórico mostrado</small>
        </article>

        <article className="historial-cliente-kpi">
          <span>Ticket promedio</span>
          <strong>
            {formatearDinero(
              historial.reduce(
                (total, registro) => total + registro.total,
                0
              ) / historial.length
            )}
          </strong>
          <small>Por consumo</small>
        </article>

      </section>

      <section className="historial-clientes-panel">

        <div className="historial-clientes-panel-header">
          <div>
            <h2>Historial de consumo</h2>

            <p>
              {historialFiltrado.length} registros encontrados
            </p>
          </div>
        </div>

        <div className="historial-clientes-table-wrapper">

          <table className="historial-clientes-table">

            <thead>
              <tr>
                <th>Cliente</th>
                <th>Pedido</th>
                <th>Mesa</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Productos principales</th>
                <th>Total</th>
                <th>Atendido por</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {historialFiltrado.map((registro) => (
                <tr key={registro.id}>

                  <td>
                    <strong>{registro.cliente}</strong>
                  </td>

                  <td>{registro.pedido}</td>

                  <td>{registro.mesa}</td>

                  <td>{registro.fecha}</td>

                  <td>{registro.hora}</td>

                  <td>
                    <div className="historial-products-cell">
                      {registro.productos
                        .slice(0, 2)
                        .map((producto) => (
                          <span key={producto}>
                            {producto}
                          </span>
                        ))}

                      {registro.productos.length > 2 && (
                        <small>
                          +{registro.productos.length - 2}
                        </small>
                      )}
                    </div>
                  </td>

                  <td>
                    <strong>
                      {formatearDinero(registro.total)}
                    </strong>
                  </td>

                  <td>{registro.usuario}</td>

                  <td>
                    <button
                      className="historial-cliente-detail-button"
                      onClick={() =>
                        setRegistroSeleccionado(registro)
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

      {registroSeleccionado && (
        <>
          <div
            className="historial-cliente-overlay"
            onClick={() => setRegistroSeleccionado(null)}
          ></div>

          <aside className="historial-cliente-drawer">

            <div className="historial-cliente-drawer-header">

              <div>
                <p className="page-eyebrow">
                  CONSUMO DEL CLIENTE
                </p>

                <h2>
                  {registroSeleccionado.cliente}
                </h2>

                <span>
                  {registroSeleccionado.pedido}
                </span>
              </div>

              <button
                className="drawer-close"
                onClick={() =>
                  setRegistroSeleccionado(null)
                }
              >
                ×
              </button>

            </div>

            <div className="historial-cliente-detail-grid">

              <div>
                <span>Mesa</span>
                <strong>
                  {registroSeleccionado.mesa}
                </strong>
              </div>

              <div>
                <span>Fecha</span>
                <strong>
                  {registroSeleccionado.fecha}
                </strong>
              </div>

              <div>
                <span>Hora</span>
                <strong>
                  {registroSeleccionado.hora}
                </strong>
              </div>

              <div>
                <span>Atendido por</span>
                <strong>
                  {registroSeleccionado.usuario}
                </strong>
              </div>

            </div>

            <div className="historial-cliente-products">

              <h3>Productos consumidos</h3>

              {registroSeleccionado.productos.map(
                (producto, index) => (
                  <div
                    key={index}
                    className="historial-cliente-product-row"
                  >
                    <span>{producto}</span>
                  </div>
                )
              )}

            </div>

            <div className="historial-cliente-total">

              <span>Total de la cuenta</span>

              <strong>
                {formatearDinero(
                  registroSeleccionado.total
                )}
              </strong>

            </div>

            <div className="historial-cliente-readonly">
              Este registro pertenece al historial de consumo y es de solo
              consulta.
            </div>

          </aside>
        </>
      )}

    </div>
  );
}

export default HistorialClientesSection;