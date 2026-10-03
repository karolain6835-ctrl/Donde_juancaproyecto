import { useNavigate } from "react-router-dom";

import {
  TrendingUp,
  ClipboardList,
  WalletCards,
  TriangleAlert,
  ChevronDown,
  ArrowRight,
  CircleDot,
  Target,
  Plus,
  PackagePlus,
  UserPlus,
  CircleDollarSign,
} from "lucide-react";

import "./DashboardPage.css";

function DashboardPage() {
  const navigate = useNavigate();

  const fechaActual = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const fechaFormateada =
    fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1);

  return (
    <div className="dashboard-page">

      {/* =========================
          ENCABEZADO
      ========================= */}

      <header className="dashboard-title">
        <p className="page-eyebrow">
          RESUMEN DEL DÍA
        </p>

        <h1 className="page-title">
          El negocio, de un vistazo
        </h1>

        <p className="page-description">
          {fechaFormateada} · Actualizado hace 2 minutos
        </p>
      </header>

      {/* =========================
          KPIs
      ========================= */}

      <section className="dashboard-kpis">

        <article className="kpi-card">
          <div className="kpi-icon success">
            <TrendingUp
              size={21}
              strokeWidth={1.9}
            />
          </div>

          <span>Ventas del día</span>

          <strong>$1.280.000</strong>

          <small className="positive">
            +8% frente a ayer
          </small>
        </article>

        <article className="kpi-card">
          <div className="kpi-icon orange">
            <ClipboardList
              size={21}
              strokeWidth={1.9}
            />
          </div>

          <span>Pedidos activos</span>

          <strong>5</strong>

          <small>
            1 pedido requiere atención
          </small>
        </article>

        <article className="kpi-card">
          <div className="kpi-icon neutral">
            <WalletCards
              size={21}
              strokeWidth={1.9}
            />
          </div>

          <span>Estado de caja</span>

          <strong>Abierta</strong>

          <small>
            $2.436.000 · desde 8:02
          </small>
        </article>

        <article className="kpi-card alert-card">
          <div className="kpi-icon danger">
            <TriangleAlert
              size={21}
              strokeWidth={1.9}
            />
          </div>

          <span>Alertas críticas</span>

          <strong>3</strong>

          <small>
            Stock y diferencia de caja
          </small>
        </article>

      </section>

      {/* =========================
          BLOQUE PRINCIPAL
      ========================= */}

      <section className="dashboard-main-grid">

        {/* VENTAS */}

        <article className="dashboard-panel sales-panel">

          <div className="panel-title">

            <div>
              <h2>
                Ventas últimos 7 días
              </h2>

              <p>
                Rendimiento diario frente al periodo anterior
              </p>
            </div>

            <button
              type="button"
              className="period-button"
            >
              7 días

              <ChevronDown
                size={16}
                strokeWidth={1.9}
              />
            </button>

          </div>

          <div className="sales-summary">
            <span>
              Ventas del periodo
            </span>

            <strong>
              $7.800.000
            </strong>
          </div>

          <div className="fake-chart">
            <div style={{ height: "35%" }}></div>
            <div style={{ height: "48%" }}></div>
            <div style={{ height: "44%" }}></div>
            <div style={{ height: "58%" }}></div>
            <div style={{ height: "72%" }}></div>

            <div
              className="highlight"
              style={{ height: "90%" }}
            ></div>

            <div style={{ height: "68%" }}></div>
          </div>

          <div className="chart-labels">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

        </article>

        {/* OPERACIÓN */}

        <article className="dashboard-panel operation-panel">

          <div className="panel-title">

            <div>
              <h2>
                Operación actual
              </h2>

              <p>
                Mesas y pedidos en tiempo real
              </p>
            </div>

            <button
              type="button"
              className="text-button"
              onClick={() =>
                navigate("/operacion/mesas")
              }
            >
              Ver salón

              <ArrowRight
                size={16}
                strokeWidth={1.9}
              />
            </button>

          </div>

          <div className="operation-stats">

            <div>
              <span>Total</span>
              <strong>12</strong>
            </div>

            <div>
              <span>Disponibles</span>
              <strong>5</strong>
            </div>

            <div>
              <span>Ocupadas</span>
              <strong>6</strong>
            </div>

          </div>

          <div className="mini-tables">

            <div className="mini-table occupied">1</div>
            <div className="mini-table occupied">2</div>
            <div className="mini-table available">3</div>
            <div className="mini-table occupied">4</div>

            <div className="mini-table available">5</div>
            <div className="mini-table payment">6</div>
            <div className="mini-table available">7</div>
            <div className="mini-table occupied">8</div>

            <div className="mini-table available">9</div>
            <div className="mini-table occupied">10</div>
            <div className="mini-table available">11</div>
            <div className="mini-table available">12</div>

          </div>

        </article>

      </section>

      {/* =========================
          BLOQUE SECUNDARIO
      ========================= */}

      <section className="dashboard-secondary-grid">

        {/* INVENTARIO */}

        <article className="dashboard-panel">

          <div className="panel-title">

            <div>
              <h2>
                Inventario crítico
              </h2>

              <p>
                Productos que requieren atención
              </p>
            </div>

            <button
              type="button"
              className="text-button"
              onClick={() =>
                navigate("/inventario")
              }
            >
              Ver alertas

              <ArrowRight
                size={16}
                strokeWidth={1.9}
              />
            </button>

          </div>

          <div className="critical-list">

            <div className="critical-item">
              <div>
                <strong>
                  Aguardiente Antioqueño
                </strong>

                <span>
                  Stock actual: 3 · mínimo: 10
                </span>
              </div>

              <span className="status-chip danger">
                Crítico
              </span>
            </div>

            <div className="critical-item">
              <div>
                <strong>
                  Poker 330ml
                </strong>

                <span>
                  Stock actual: 12 · mínimo: 24
                </span>
              </div>

              <span className="status-chip warning">
                Bajo
              </span>
            </div>

            <div className="critical-item">
              <div>
                <strong>
                  Ron Medellín 750ml
                </strong>

                <span>
                  Stock actual: 5 · mínimo: 8
                </span>
              </div>

              <span className="status-chip warning">
                Bajo
              </span>
            </div>

          </div>

        </article>

        {/* JUEGOS */}

        <article className="dashboard-panel">

          <div className="panel-title">

            <div>
              <h2>
                Juegos activos
              </h2>

              <p>
                Sesiones en curso
              </p>
            </div>

            <button
              type="button"
              className="text-button"
              onClick={() =>
                navigate("/juegos")
              }
            >
              Ver juegos

              <ArrowRight
                size={16}
                strokeWidth={1.9}
              />
            </button>

          </div>

          <div className="game-list">

            <div className="game-item">

              <div className="game-icon">
                <CircleDot
                  size={21}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <strong>
                  Billar 1
                </strong>

                <span>
                  Mesa 4 · 01:24 h
                </span>
              </div>

              <span className="status-chip success">
                Activo
              </span>

            </div>

            <div className="game-item">

              <div className="game-icon">
                <Target
                  size={21}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <strong>
                  Tejo 2
                </strong>

                <span>
                  Mesa 8 · Ronda 3
                </span>
              </div>

              <span className="status-chip success">
                Activo
              </span>

            </div>

            <div className="game-item">

              <div className="game-icon">
                <CircleDot
                  size={21}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <strong>
                  Billar 2
                </strong>

                <span>
                  Sin sesión activa
                </span>
              </div>

              <span className="status-chip neutral">
                Disponible
              </span>

            </div>

          </div>

        </article>

      </section>

      {/* =========================
          PARTE INFERIOR
      ========================= */}

      <section className="dashboard-bottom-grid">

        {/* ACTIVIDAD */}

        <article className="dashboard-panel">

          <div className="panel-title">

            <div>
              <h2>
                Actividad reciente
              </h2>

              <p>
                Últimos eventos del sistema
              </p>
            </div>

          </div>

          <div className="activity-list">

            <div className="activity-item">
              <span className="activity-time">
                10:42
              </span>

              <div>
                <strong>
                  Laura creó pedido P-3842
                </strong>

                <span>
                  Mesa 4
                </span>
              </div>
            </div>

            <div className="activity-item">
              <span className="activity-time">
                10:38
              </span>

              <div>
                <strong>
                  Stock de Poker cayó por debajo del mínimo
                </strong>

                <span>
                  Inventario
                </span>
              </div>
            </div>

            <div className="activity-item">
              <span className="activity-time">
                10:31
              </span>

              <div>
                <strong>
                  Carlos inició sesión de Billar 1
                </strong>

                <span>
                  Mesa 6
                </span>
              </div>
            </div>

            <div className="activity-item">
              <span className="activity-time">
                10:15
              </span>

              <div>
                <strong>
                  Se registró una compra de Bavaria
                </strong>

                <span>
                  Compras
                </span>
              </div>
            </div>

          </div>

        </article>

        {/* ACCIONES RÁPIDAS */}

        <article className="dashboard-panel quick-actions-panel">

          <div className="panel-title">

            <div>
              <h2>
                Acciones rápidas
              </h2>

              <p>
                Gestiones frecuentes
              </p>
            </div>

          </div>

          <div className="quick-actions">

            <button
              type="button"
              onClick={() =>
                navigate("/compras")
              }
            >
              <span>
                <Plus
                  size={21}
                  strokeWidth={1.9}
                />
              </span>

              Nueva compra
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/inventario")
              }
            >
              <span>
                <PackagePlus
                  size={21}
                  strokeWidth={1.9}
                />
              </span>

              Registrar producto
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/administracion")
              }
            >
              <span>
                <UserPlus
                  size={21}
                  strokeWidth={1.9}
                />
              </span>

              Crear usuario
            </button>

            <button
              type="button"
              className="accent-action"
              onClick={() =>
                navigate("/caja")
              }
            >
              <span>
                <CircleDollarSign
                  size={21}
                  strokeWidth={1.9}
                />
              </span>

              Cerrar caja
            </button>

          </div>

        </article>

      </section>

    </div>
  );
}

export default DashboardPage;