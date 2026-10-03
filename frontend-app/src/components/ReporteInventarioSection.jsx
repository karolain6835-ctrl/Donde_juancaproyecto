import { useMemo, useState } from "react";
import "./ReporteInventarioSection.css";

function ReporteInventarioSection() {
  const [periodo, setPeriodo] = useState("hoy");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const productosCriticos = [
    {
      id: 1,
      producto: "Poker 330ml",
      categoria: "Cervezas",
      stock: 8,
      minimo: 20,
      valor: 20000,
      estado: "bajo",
    },
    {
      id: 2,
      producto: "Ron Medellín 750ml",
      categoria: "Licores",
      stock: 2,
      minimo: 6,
      valor: 96000,
      estado: "critico",
    },
    {
      id: 3,
      producto: "Papas",
      categoria: "Comidas",
      stock: 0,
      minimo: 10,
      valor: 0,
      estado: "agotado",
    },
    {
      id: 4,
      producto: "Coca-Cola 400ml",
      categoria: "Gaseosas",
      stock: 7,
      minimo: 12,
      valor: 14700,
      estado: "bajo",
    },
  ];

  const categorias = [
    {
      nombre: "Cervezas",
      valor: 860000,
      porcentaje: 34,
    },
    {
      nombre: "Licores",
      valor: 720000,
      porcentaje: 29,
    },
    {
      nombre: "Gaseosas",
      valor: 430000,
      porcentaje: 17,
    },
    {
      nombre: "Comidas",
      valor: 310000,
      porcentaje: 12,
    },
    {
      nombre: "Otros",
      valor: 200000,
      porcentaje: 8,
    },
  ];

  const evolucionInventario = [
    { fecha: "26 Sep", valor: 2280000 },
    { fecha: "27 Sep", valor: 2340000 },
    { fecha: "28 Sep", valor: 2410000 },
    { fecha: "29 Sep", valor: 2390000 },
    { fecha: "30 Sep", valor: 2480000 },
    { fecha: "01 Oct", valor: 2510000 },
    { fecha: "02 Oct", valor: 2520000 },
  ];

  const valorInventario = 2520000;
  const stockBajo = productosCriticos.filter(
    (producto) => producto.estado === "bajo"
  ).length;
  const agotados = productosCriticos.filter(
    (producto) => producto.estado === "agotado"
  ).length;
  const movimientos = 84;

  const maxEvolucion = useMemo(() => {
    return Math.max(
      ...evolucionInventario.map((registro) => registro.valor)
    );
  }, [evolucionInventario]);

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function nombreEstado(estado) {
    if (estado === "bajo") return "Stock bajo";
    if (estado === "critico") return "Crítico";
    if (estado === "agotado") return "Agotado";
    return estado;
  }

  return (
    <div className="reporte-inventario-section">

      <section className="reporte-inventario-toolbar">

        <div>
          <h2>Estado del inventario</h2>
          <p>
            Analiza valor, disponibilidad y movimientos de existencias.
          </p>
        </div>

        <select
          value={periodo}
          onChange={(event) => setPeriodo(event.target.value)}
        >
          <option value="hoy">Hoy</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
          <option value="personalizado">Personalizado</option>
        </select>

      </section>

      <section className="reporte-inventario-kpis">

        <article className="reporte-inventario-kpi">
          <span>Valor del inventario</span>
          <strong>{formatearDinero(valorInventario)}</strong>
          <small>Costo estimado actual</small>
        </article>

        <article className="reporte-inventario-kpi">
          <span>Stock bajo</span>
          <strong>{stockBajo}</strong>
          <small>Productos por debajo del mínimo</small>
        </article>

        <article className="reporte-inventario-kpi">
          <span>Agotados</span>
          <strong>{agotados}</strong>
          <small>Sin unidades disponibles</small>
        </article>

        <article className="reporte-inventario-kpi">
          <span>Movimientos</span>
          <strong>{movimientos}</strong>
          <small>Entradas y salidas del período</small>
        </article>

      </section>

      <section className="reporte-inventario-main-grid">

        <article className="reporte-inventario-panel">

          <div className="reporte-inventario-panel-header">
            <div>
              <h3>Valor por categoría</h3>
              <p>Distribución del inventario actual</p>
            </div>
          </div>

          <div className="inventario-category-list">

            {categorias.map((categoria) => (
              <div
                key={categoria.nombre}
                className="inventario-category-row"
              >

                <div className="inventario-category-info">
                  <div>
                    <strong>{categoria.nombre}</strong>
                    <span>
                      {formatearDinero(categoria.valor)}
                    </span>
                  </div>

                  <strong>
                    {categoria.porcentaje}%
                  </strong>
                </div>

                <div className="inventario-category-track">
                  <div
                    className="inventario-category-bar"
                    style={{
                      width: `${categoria.porcentaje}%`,
                    }}
                  ></div>
                </div>

              </div>
            ))}

          </div>

        </article>

        <article className="reporte-inventario-panel">

          <div className="reporte-inventario-panel-header">
            <div>
              <h3>Evolución del inventario</h3>
              <p>Valor estimado durante los últimos días</p>
            </div>
          </div>

          <div className="inventario-evolution-chart">

            {evolucionInventario.map((registro) => {
              const porcentaje =
                (registro.valor / maxEvolucion) * 100;

              return (
                <div
                  key={registro.fecha}
                  className="inventario-evolution-item"
                >

                  <div className="inventario-evolution-value">
                    {formatearDinero(registro.valor)}
                  </div>

                  <div className="inventario-evolution-bar-area">
                    <div
                      className="inventario-evolution-bar"
                      style={{
                        height: `${Math.max(
                          porcentaje,
                          20
                        )}%`,
                      }}
                    ></div>
                  </div>

                  <span>{registro.fecha}</span>

                </div>
              );
            })}

          </div>

        </article>

      </section>

      <section className="reporte-inventario-panel">

        <div className="reporte-inventario-panel-header">

          <div>
            <h3>Productos críticos</h3>
            <p>
              Referencias que requieren atención de inventario
            </p>
          </div>

        </div>

        <div className="reporte-inventario-table-wrapper">

          <table className="reporte-inventario-table">

            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Stock actual</th>
                <th>Stock mínimo</th>
                <th>Valor actual</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {productosCriticos.map((producto) => (
                <tr key={producto.id}>

                  <td>
                    <strong>{producto.producto}</strong>
                  </td>

                  <td>{producto.categoria}</td>

                  <td>{producto.stock}</td>

                  <td>{producto.minimo}</td>

                  <td>
                    {formatearDinero(producto.valor)}
                  </td>

                  <td>
                    <span
                      className={`inventario-report-status ${producto.estado}`}
                    >
                      {nombreEstado(producto.estado)}
                    </span>
                  </td>

                  <td>
                    <button
                      className="reporte-inventario-detail-button"
                      onClick={() =>
                        setProductoSeleccionado(producto)
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

      {productoSeleccionado && (
        <>
          <div
            className="reporte-inventario-overlay"
            onClick={() => setProductoSeleccionado(null)}
          ></div>

          <aside className="reporte-inventario-drawer">

            <div className="reporte-inventario-drawer-header">

              <div>
                <p className="page-eyebrow">
                  PRODUCTO CRÍTICO
                </p>

                <h2>
                  {productoSeleccionado.producto}
                </h2>

                <span>
                  {productoSeleccionado.categoria}
                </span>
              </div>

              <button
                className="drawer-close"
                onClick={() =>
                  setProductoSeleccionado(null)
                }
              >
                ×
              </button>

            </div>

            <div className="reporte-inventario-status-box">

              <span>Estado de inventario</span>

              <strong>
                {nombreEstado(
                  productoSeleccionado.estado
                )}
              </strong>

            </div>

            <div className="reporte-inventario-detail-grid">

              <div>
                <span>Stock actual</span>
                <strong>
                  {productoSeleccionado.stock}
                </strong>
              </div>

              <div>
                <span>Stock mínimo</span>
                <strong>
                  {productoSeleccionado.minimo}
                </strong>
              </div>

              <div>
                <span>Diferencia</span>
                <strong>
                  {productoSeleccionado.stock -
                    productoSeleccionado.minimo}
                </strong>
              </div>

              <div>
                <span>Valor actual</span>
                <strong>
                  {formatearDinero(
                    productoSeleccionado.valor
                  )}
                </strong>
              </div>

            </div>

            <div className="reporte-inventario-notice">
              Este reporte es informativo. Los ajustes de stock deben
              realizarse desde el módulo de Inventario para conservar el
              historial de movimientos.
            </div>

          </aside>
        </>
      )}

    </div>
  );
}

export default ReporteInventarioSection;