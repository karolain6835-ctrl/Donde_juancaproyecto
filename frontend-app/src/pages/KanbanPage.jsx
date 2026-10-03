import { useMemo, useState } from "react";

import {
  Clock3,
  Utensils,
  Beer,
  Gamepad2,
  CircleCheck,
  TriangleAlert,
  Play,
  Check,
  XCircle,
} from "lucide-react";

import "./KanbanPage.css";

function KanbanPage() {
  const [filtroArea, setFiltroArea] = useState("todas");

  const [items, setItems] = useState([
    {
      id: 1,
      pedido: "P-3842",
      mesa: "Mesa 1",
      producto: "Hamburguesa especial",
      area: "cocina",
      estado: "enviado",
      tiempo: 8,
      responsable: "Laura",
    },
    {
      id: 2,
      pedido: "P-3842",
      mesa: "Mesa 1",
      producto: "Poker 330ml",
      area: "bar",
      estado: "preparando",
      tiempo: 12,
      responsable: "Carlos",
    },
    {
      id: 3,
      pedido: "P-3845",
      mesa: "Mesa 2",
      producto: "Aguardiente Antioqueño",
      area: "bar",
      estado: "enviado",
      tiempo: 5,
      responsable: "Carlos",
    },
    {
      id: 4,
      pedido: "P-3846",
      mesa: "Mesa 4",
      producto: "Picada para dos",
      area: "cocina",
      estado: "preparando",
      tiempo: 31,
      responsable: "Laura",
    },
    {
      id: 5,
      pedido: "P-3847",
      mesa: "Mesa 8",
      producto: "Sesión Billar 1",
      area: "juegos",
      estado: "servido",
      tiempo: 45,
      responsable: "Daniela",
    },
    {
      id: 6,
      pedido: "P-3848",
      mesa: "Mesa 10",
      producto: "Club Colombia",
      area: "bar",
      estado: "servido",
      tiempo: 15,
      responsable: "Carlos",
    },
    {
      id: 7,
      pedido: "P-3838",
      mesa: "Mesa 6",
      producto: "Papas a la francesa",
      area: "cocina",
      estado: "cancelado",
      tiempo: 7,
      responsable: "Laura",
    },
    {
      id: 8,
      pedido: "P-3849",
      mesa: "Mesa 3",
      producto: "Sesión Tejo 2",
      area: "juegos",
      estado: "enviado",
      tiempo: 3,
      responsable: "Daniela",
    },
  ]);

  const itemsFiltrados = useMemo(() => {
    if (filtroArea === "todas") {
      return items;
    }

    return items.filter((item) => item.area === filtroArea);
  }, [items, filtroArea]);

  const columnas = [
    {
      id: "enviado",
      titulo: "Enviado",
      descripcion: "Pendiente de iniciar",
    },
    {
      id: "preparando",
      titulo: "Preparando",
      descripcion: "En proceso",
    },
    {
      id: "servido",
      titulo: "Servido",
      descripcion: "Completado",
    },
    {
      id: "cancelado",
      titulo: "Cancelado",
      descripcion: "Solo consulta",
    },
  ];

  function cambiarEstado(id, nuevoEstado) {
    setItems((itemsActuales) =>
      itemsActuales.map((item) =>
        item.id === id
          ? {
              ...item,
              estado: nuevoEstado,
            }
          : item
      )
    );
  }

  function nombreArea(area) {
    if (area === "bar") return "Bar";
    if (area === "cocina") return "Cocina";
    if (area === "juegos") return "Juegos";

    return area;
  }

  function iconoArea(area) {
    if (area === "bar") {
      return <Beer size={14} strokeWidth={1.9} />;
    }

    if (area === "cocina") {
      return <Utensils size={14} strokeWidth={1.9} />;
    }

    if (area === "juegos") {
      return <Gamepad2 size={14} strokeWidth={1.9} />;
    }

    return null;
  }

  return (
    <div className="kanban-page">

      {/* =========================
          ENCABEZADO
      ========================= */}

      <header className="kanban-header">
        <div>
          <p className="page-eyebrow">
            OPERACIÓN
          </p>

          <h1 className="page-title">
            Kanban
          </h1>

          <p className="page-description">
            Seguimiento de comandas por producto y área de atención.
          </p>
        </div>
      </header>

      {/* =========================
          FILTROS
      ========================= */}

      <section className="kanban-toolbar">

        <div className="kanban-filters">

          <button
            type="button"
            className={`filter-button ${
              filtroArea === "todas" ? "active" : ""
            }`}
            onClick={() => setFiltroArea("todas")}
          >
            Todas
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroArea === "bar" ? "active" : ""
            }`}
            onClick={() => setFiltroArea("bar")}
          >
            Bar
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroArea === "cocina" ? "active" : ""
            }`}
            onClick={() => setFiltroArea("cocina")}
          >
            Cocina
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroArea === "juegos" ? "active" : ""
            }`}
            onClick={() => setFiltroArea("juegos")}
          >
            Juegos
          </button>

        </div>

        <div className="kanban-summary">
          <span>
            {itemsFiltrados.length} ítems visibles
          </span>
        </div>

      </section>

      {/* =========================
          TABLERO
      ========================= */}

      <section className="kanban-board">

        {columnas.map((columna) => {
          const itemsColumna = itemsFiltrados.filter(
            (item) => item.estado === columna.id
          );

          return (
            <article
              key={columna.id}
              className={`kanban-column ${columna.id}`}
            >

              <div className="kanban-column-header">

                <div>
                  <h2>
                    {columna.titulo}
                  </h2>

                  <p>
                    {columna.descripcion}
                  </p>
                </div>

                <span className="kanban-count">
                  {itemsColumna.length}
                </span>

              </div>

              <div className="kanban-column-content">

                {itemsColumna.length === 0 && (
                  <div className="kanban-empty">
                    Sin ítems
                  </div>
                )}

                {itemsColumna.map((item) => {
                  const retrasado =
                    item.estado !== "servido" &&
                    item.estado !== "cancelado" &&
                    item.tiempo >= 25;

                  return (
                    <div
                      key={item.id}
                      className={`kanban-card ${
                        retrasado ? "delayed" : ""
                      }`}
                    >

                      <div className="kanban-card-top">

                        <span
                          className={`area-chip ${item.area}`}
                        >
                          {iconoArea(item.area)}

                          {nombreArea(item.area)}
                        </span>

                        <span className="kanban-time">
                          <Clock3
                            size={13}
                            strokeWidth={1.9}
                          />

                          {item.tiempo} min
                        </span>

                      </div>

                      <div className="kanban-card-body">

                        <h3>
                          {item.producto}
                        </h3>

                        <div className="kanban-meta">

                          <span>
                            {item.pedido}
                          </span>

                          <span>
                            {item.mesa}
                          </span>

                        </div>

                        <div className="kanban-responsable">

                          <span>
                            Responsable
                          </span>

                          <strong>
                            {item.responsable}
                          </strong>

                        </div>

                        {retrasado && (
                          <div className="kanban-delay-warning">

                            <TriangleAlert
                              size={14}
                              strokeWidth={1.9}
                            />

                            Requiere atención

                          </div>
                        )}

                      </div>

                      {item.estado === "enviado" && (
                        <button
                          type="button"
                          className="kanban-action primary"
                          onClick={() =>
                            cambiarEstado(
                              item.id,
                              "preparando"
                            )
                          }
                        >
                          <Play
                            size={16}
                            strokeWidth={1.9}
                          />

                          Iniciar preparación
                        </button>
                      )}

                      {item.estado === "preparando" && (
                        <button
                          type="button"
                          className="kanban-action success"
                          onClick={() =>
                            cambiarEstado(
                              item.id,
                              "servido"
                            )
                          }
                        >
                          <Check
                            size={16}
                            strokeWidth={1.9}
                          />

                          Marcar servido
                        </button>
                      )}

                      {item.estado === "servido" && (
                        <div className="kanban-complete">

                          <CircleCheck
                            size={15}
                            strokeWidth={1.9}
                          />

                          Servido

                        </div>
                      )}

                      {item.estado === "cancelado" && (
                        <div className="kanban-cancelled">

                          <XCircle
                            size={15}
                            strokeWidth={1.9}
                          />

                          Cancelado

                        </div>
                      )}

                    </div>
                  );
                })}

              </div>

            </article>
          );
        })}

      </section>

    </div>
  );
}

export default KanbanPage;