import { useMemo, useState } from "react";

import {
  Plus,
  Search,
  Boxes,
  TriangleAlert,
  BadgeDollarSign,
  PackageX,
  ArrowRight,
  X,
  SlidersHorizontal,
  Pencil,
  History,
  Tags,
  Power,
  PowerOff,
} from "lucide-react";

import InventarioNav from "../components/InventarioNav";
import RefrigeradoresSection from "../components/RefrigeradoresSection";
import MovimientosSection from "../components/MovimientosSection";
import AlertasSection from "../components/AlertasSection";
import MermasSection from "../components/MermasSection";

import "./InventarioPage.css";

function InventarioPage() {
  const [seccionActiva, setSeccionActiva] = useState("resumen");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  const productos = [
    {
      id: 1,
      codigo: "BEB-001",
      nombre: "Poker 330ml",
      categoria: "Cervezas",
      stock: 12,
      minimo: 24,
      costo: 2500,
      precio: 4500,
      activo: true,
      estadoStock: "bajo",
    },
    {
      id: 2,
      codigo: "LIC-001",
      nombre: "Aguardiente Antioqueño",
      categoria: "Licores",
      stock: 3,
      minimo: 10,
      costo: 42000,
      precio: 65000,
      activo: true,
      estadoStock: "critico",
    },
    {
      id: 3,
      codigo: "LIC-002",
      nombre: "Ron Medellín 750ml",
      categoria: "Licores",
      stock: 5,
      minimo: 8,
      costo: 48000,
      precio: 72000,
      activo: true,
      estadoStock: "bajo",
    },
    {
      id: 4,
      codigo: "BEB-002",
      nombre: "Club Colombia",
      categoria: "Cervezas",
      stock: 38,
      minimo: 18,
      costo: 3100,
      precio: 5500,
      activo: true,
      estadoStock: "normal",
    },
    {
      id: 5,
      codigo: "GAS-001",
      nombre: "Coca-Cola 400ml",
      categoria: "Gaseosas",
      stock: 42,
      minimo: 20,
      costo: 2100,
      precio: 4000,
      activo: true,
      estadoStock: "normal",
    },
    {
      id: 6,
      codigo: "COM-001",
      nombre: "Papas a la francesa",
      categoria: "Comidas",
      stock: 0,
      minimo: 10,
      costo: 4500,
      precio: 10000,
      activo: false,
      estadoStock: "agotado",
    },
  ];

  const [categorias, setCategorias] = useState([
    {
      id: 1,
      nombre: "Cervezas",
      descripcion: "Cervezas nacionales e importadas.",
      activo: true,
    },
    {
      id: 2,
      nombre: "Licores",
      descripcion: "Aguardientes, rones y otros licores.",
      activo: true,
    },
    {
      id: 3,
      nombre: "Gaseosas",
      descripcion: "Bebidas gaseosas y refrescos.",
      activo: true,
    },
    {
      id: 4,
      nombre: "Comidas",
      descripcion: "Productos preparados de cocina.",
      activo: true,
    },
    {
      id: 5,
      nombre: "Snacks",
      descripcion: "Productos de consumo rápido.",
      activo: false,
    },
  ]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((producto) => {
      const coincideEstado =
        filtroEstado === "todos" ||
        producto.estadoStock === filtroEstado;

      const texto = busqueda.toLowerCase();

      const coincideBusqueda =
        producto.nombre.toLowerCase().includes(texto) ||
        producto.codigo.toLowerCase().includes(texto) ||
        producto.categoria.toLowerCase().includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [busqueda, filtroEstado]);

  const categoriasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return categorias.filter(
      (categoria) =>
        categoria.nombre.toLowerCase().includes(texto) ||
        categoria.descripcion.toLowerCase().includes(texto)
    );
  }, [busqueda, categorias]);

  const totalReferencias = productos.length;

  const stockBajo = productos.filter(
    (producto) =>
      producto.estadoStock === "bajo" ||
      producto.estadoStock === "critico"
  ).length;

  const agotados = productos.filter(
    (producto) => producto.estadoStock === "agotado"
  ).length;

  const valorInventario = productos.reduce(
    (total, producto) =>
      total + producto.stock * producto.costo,
    0
  );

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function nombreEstadoStock(estado) {
    if (estado === "normal") return "Normal";
    if (estado === "bajo") return "Stock bajo";
    if (estado === "critico") return "Crítico";
    if (estado === "agotado") return "Agotado";

    return estado;
  }

  function cerrarDetalleProducto() {
    setProductoSeleccionado(null);
  }

  function cerrarDetalleCategoria() {
    setCategoriaSeleccionada(null);
  }

  function cambiarEstadoCategoria(id) {
    setCategorias((categoriasActuales) =>
      categoriasActuales.map((categoria) =>
        categoria.id === id
          ? {
              ...categoria,
              activo: !categoria.activo,
            }
          : categoria
      )
    );

    setCategoriaSeleccionada((categoriaActual) =>
      categoriaActual
        ? {
            ...categoriaActual,
            activo: !categoriaActual.activo,
          }
        : null
    );
  }

  function descripcionSeccion() {
    if (seccionActiva === "resumen") {
      return "Consulta existencias, alertas y valor estimado del inventario.";
    }

    if (seccionActiva === "productos") {
      return "Administra los productos registrados en Donde Juanca.";
    }

    if (seccionActiva === "categorias") {
      return "Administra las categorías utilizadas para organizar los productos.";
    }

    if (seccionActiva === "refrigeradores") {
      return "Consulta y controla los equipos de refrigeración.";
    }

    if (seccionActiva === "movimientos") {
      return "Consulta entradas, salidas y ajustes de inventario.";
    }

    if (seccionActiva === "alertas") {
      return "Revisa productos y existencias que requieren atención.";
    }

    if (seccionActiva === "mermas") {
      return "Registra y consulta pérdidas o desperdicios de inventario.";
    }

    return "";
  }

  return (
    <div className="inventario-page">

      {/* =========================
          ENCABEZADO
      ========================= */}

      <header className="inventario-header">

        <div>
          <p className="page-eyebrow">
            INVENTARIO
          </p>

          <h1 className="page-title">
            {seccionActiva === "resumen" && "Resumen"}
            {seccionActiva === "productos" && "Productos"}
            {seccionActiva === "categorias" && "Categorías"}
            {seccionActiva === "refrigeradores" && "Refrigeradores"}
            {seccionActiva === "movimientos" && "Movimientos"}
            {seccionActiva === "alertas" && "Alertas"}
            {seccionActiva === "mermas" && "Mermas"}
          </h1>

          <p className="page-description">
            {descripcionSeccion()}
          </p>
        </div>

        {seccionActiva === "productos" && (
          <button
            type="button"
            className="primary-button inventario-primary-action"
          >
            <Plus
              size={18}
              strokeWidth={1.9}
            />

            Nuevo producto
          </button>
        )}

        {seccionActiva === "categorias" && (
          <button
            type="button"
            className="primary-button inventario-primary-action"
          >
            <Plus
              size={18}
              strokeWidth={1.9}
            />

            Nueva categoría
          </button>
        )}

      </header>

      {/* =========================
          NAVEGACIÓN
      ========================= */}

      <InventarioNav
        seccionActiva={seccionActiva}
        onCambiarSeccion={(seccion) => {
          setSeccionActiva(seccion);
          setBusqueda("");
          setFiltroEstado("todos");
        }}
      />

      {/* =========================
          RESUMEN
      ========================= */}

      {seccionActiva === "resumen" && (
        <>

          <section className="inventario-kpis">

            <button
              type="button"
              className={`inventario-kpi ${
                filtroEstado === "todos"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("todos")
              }
            >
              <div className="inventario-kpi-icon references">
                <Boxes
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Referencias
              </span>

              <strong>
                {totalReferencias}
              </strong>

              <small>
                Productos registrados
              </small>
            </button>

            <button
              type="button"
              className={`inventario-kpi ${
                filtroEstado === "bajo"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("bajo")
              }
            >
              <div className="inventario-kpi-icon warning">
                <TriangleAlert
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Con stock bajo
              </span>

              <strong>
                {stockBajo}
              </strong>

              <small className="inventario-warning">
                Requieren reposición
              </small>
            </button>

            <article className="inventario-kpi">
              <div className="inventario-kpi-icon value">
                <BadgeDollarSign
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Valor estimado
              </span>

              <strong>
                {formatearDinero(valorInventario)}
              </strong>

              <small>
                Según costo registrado
              </small>
            </article>

            <button
              type="button"
              className={`inventario-kpi alert ${
                filtroEstado === "agotado"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("agotado")
              }
            >
              <div className="inventario-kpi-icon danger">
                <PackageX
                  size={20}
                  strokeWidth={1.9}
                />
              </div>

              <span>
                Agotados
              </span>

              <strong>
                {agotados}
              </strong>

              <small>
                Sin existencias
              </small>
            </button>

          </section>

          <section className="inventario-toolbar">

            <div className="inventario-filters">

              <button
                type="button"
                className={`filter-button ${
                  filtroEstado === "todos"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setFiltroEstado("todos")
                }
              >
                Todos
              </button>

              <button
                type="button"
                className={`filter-button ${
                  filtroEstado === "normal"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setFiltroEstado("normal")
                }
              >
                Normal
              </button>

              <button
                type="button"
                className={`filter-button ${
                  filtroEstado === "bajo"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setFiltroEstado("bajo")
                }
              >
                Stock bajo
              </button>

              <button
                type="button"
                className={`filter-button ${
                  filtroEstado === "critico"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setFiltroEstado("critico")
                }
              >
                Crítico
              </button>

              <button
                type="button"
                className={`filter-button ${
                  filtroEstado === "agotado"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setFiltroEstado("agotado")
                }
              >
                Agotados
              </button>

            </div>

            <div className="inventario-search">

              <Search
                className="inventario-search-icon"
                size={18}
                strokeWidth={1.9}
              />

              <input
                type="text"
                placeholder="Buscar producto, código o categoría..."
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
              />

            </div>

          </section>

        </>
      )}

      {/* =========================
          PRODUCTOS
      ========================= */}

      {seccionActiva === "productos" && (
        <section className="inventario-toolbar">

          <div className="inventario-filters">

            <button
              type="button"
              className={`filter-button ${
                filtroEstado === "todos"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("todos")
              }
            >
              Todos
            </button>

            <button
              type="button"
              className={`filter-button ${
                filtroEstado === "normal"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("normal")
              }
            >
              Normal
            </button>

            <button
              type="button"
              className={`filter-button ${
                filtroEstado === "bajo"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("bajo")
              }
            >
              Stock bajo
            </button>

            <button
              type="button"
              className={`filter-button ${
                filtroEstado === "agotado"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFiltroEstado("agotado")
              }
            >
              Agotados
            </button>

          </div>

          <div className="inventario-search">

            <Search
              className="inventario-search-icon"
              size={18}
              strokeWidth={1.9}
            />

            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
            />

          </div>

        </section>
      )}

      {/* =========================
          TABLA PRODUCTOS
      ========================= */}

      {(seccionActiva === "resumen" ||
        seccionActiva === "productos") && (

        <section className="inventario-panel">

          <div className="inventario-panel-header">

            <div>
              <h2>
                {seccionActiva === "resumen"
                  ? "Existencias"
                  : "Productos"}
              </h2>

              <p>
                {productosFiltrados.length} productos encontrados
              </p>
            </div>

          </div>

          <div className="inventario-table-wrapper">

            <table className="inventario-table">

              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Costo</th>
                  <th>Stock</th>
                  <th>Estado producto</th>
                  <th>Estado stock</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>

                {productosFiltrados.map((producto) => (

                  <tr
                    key={producto.id}
                    className={
                      producto.estadoStock === "agotado" ||
                      producto.estadoStock === "critico"
                        ? "inventario-row attention"
                        : "inventario-row"
                    }
                  >

                    <td>
                      <span className="producto-code">
                        {producto.codigo}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {producto.nombre}
                      </strong>
                    </td>

                    <td>
                      {producto.categoria}
                    </td>

                    <td>
                      {formatearDinero(producto.precio)}
                    </td>

                    <td>
                      {formatearDinero(producto.costo)}
                    </td>

                    <td>
                      <strong className="producto-stock-value">
                        {producto.stock}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`producto-active-status ${
                          producto.activo
                            ? "activo"
                            : "inactivo"
                        }`}
                      >
                        {producto.activo
                          ? "Activo"
                          : "Inactivo"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`inventario-status ${producto.estadoStock}`}
                      >
                        {nombreEstadoStock(
                          producto.estadoStock
                        )}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="inventario-detail-button"
                        onClick={() =>
                          setProductoSeleccionado(producto)
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
      )}

      {/* =========================
          CATEGORÍAS
      ========================= */}

      {seccionActiva === "categorias" && (
        <>

          <section className="inventario-toolbar">

            <div className="categorias-summary">

              <span>
                {
                  categorias.filter(
                    (categoria) => categoria.activo
                  ).length
                }{" "}
                activas
              </span>

              <span>
                {
                  categorias.filter(
                    (categoria) => !categoria.activo
                  ).length
                }{" "}
                inactivas
              </span>

            </div>

            <div className="inventario-search">

              <Search
                className="inventario-search-icon"
                size={18}
                strokeWidth={1.9}
              />

              <input
                type="text"
                placeholder="Buscar categoría..."
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
              />

            </div>

          </section>

          <section className="categorias-grid">

            {categoriasFiltradas.map((categoria) => (

              <article
                key={categoria.id}
                className="categoria-card"
              >

                <div className="categoria-card-icon">
                  <Tags
                    size={19}
                    strokeWidth={1.9}
                  />
                </div>

                <div className="categoria-card-header">

                  <div>
                    <h3>
                      {categoria.nombre}
                    </h3>

                    <span
                      className={`categoria-status ${
                        categoria.activo
                          ? "activa"
                          : "inactiva"
                      }`}
                    >
                      {categoria.activo
                        ? "Activa"
                        : "Inactiva"}
                    </span>
                  </div>

                </div>

                <p>
                  {categoria.descripcion}
                </p>

                <div className="categoria-card-footer">

                  <button
                    type="button"
                    className="categoria-detail-button"
                    onClick={() =>
                      setCategoriaSeleccionada(categoria)
                    }
                  >
                    Ver detalle

                    <ArrowRight
                      size={15}
                      strokeWidth={1.9}
                    />
                  </button>

                  <button
                    type="button"
                    className={
                      categoria.activo
                        ? "categoria-toggle-button deactivate"
                        : "categoria-toggle-button activate"
                    }
                    onClick={() =>
                      cambiarEstadoCategoria(categoria.id)
                    }
                  >
                    {categoria.activo ? (
                      <PowerOff
                        size={14}
                        strokeWidth={1.9}
                      />
                    ) : (
                      <Power
                        size={14}
                        strokeWidth={1.9}
                      />
                    )}

                    {categoria.activo
                      ? "Desactivar"
                      : "Activar"}
                  </button>

                </div>

              </article>
            ))}

          </section>

        </>
      )}

      {/* =========================
          SUBSECCIONES
      ========================= */}

      {seccionActiva === "refrigeradores" && (
        <RefrigeradoresSection />
      )}

      {seccionActiva === "movimientos" && (
        <MovimientosSection />
      )}

      {seccionActiva === "alertas" && (
        <AlertasSection />
      )}

      {seccionActiva === "mermas" && (
        <MermasSection />
      )}

      {/* =========================
          DRAWER PRODUCTO
      ========================= */}

      {productoSeleccionado && (
        <>

          <div
            className="inventario-overlay"
            onClick={cerrarDetalleProducto}
          ></div>

          <aside className="inventario-drawer">

            <div className="inventario-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DEL PRODUCTO
                </p>

                <h2>
                  {productoSeleccionado.nombre}
                </h2>

                <span>
                  {productoSeleccionado.codigo}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={cerrarDetalleProducto}
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div
              className={`inventario-drawer-status ${
                productoSeleccionado.activo
                  ? "activo"
                  : "inactivo"
              }`}
            >
              <span>
                Estado del producto
              </span>

              <strong>
                {productoSeleccionado.activo
                  ? "Activo"
                  : "Inactivo"}
              </strong>
            </div>

            <div className="inventario-detail-grid">

              <div>
                <span>
                  Categoría
                </span>

                <strong>
                  {productoSeleccionado.categoria}
                </strong>
              </div>

              <div>
                <span>
                  Stock actual
                </span>

                <strong>
                  {productoSeleccionado.stock}
                </strong>
              </div>

              <div>
                <span>
                  Stock mínimo
                </span>

                <strong>
                  {productoSeleccionado.minimo}
                </strong>
              </div>

              <div>
                <span>
                  Costo unitario
                </span>

                <strong>
                  {formatearDinero(
                    productoSeleccionado.costo
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Precio de venta
                </span>

                <strong>
                  {formatearDinero(
                    productoSeleccionado.precio
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Estado de stock
                </span>

                <strong>
                  {nombreEstadoStock(
                    productoSeleccionado.estadoStock
                  )}
                </strong>
              </div>

            </div>

            <div className="inventario-drawer-actions">

              <button
                type="button"
                className="drawer-primary-button"
              >
                <SlidersHorizontal
                  size={17}
                  strokeWidth={1.9}
                />

                Ajustar stock
              </button>

              <button
                type="button"
                className="drawer-secondary-button"
              >
                <Pencil
                  size={17}
                  strokeWidth={1.9}
                />

                Editar producto
              </button>

              <button
                type="button"
                className="drawer-secondary-button"
              >
                <History
                  size={17}
                  strokeWidth={1.9}
                />

                Ver movimientos
              </button>

            </div>

          </aside>

        </>
      )}

      {/* =========================
          DRAWER CATEGORÍA
      ========================= */}

      {categoriaSeleccionada && (
        <>

          <div
            className="inventario-overlay"
            onClick={cerrarDetalleCategoria}
          ></div>

          <aside className="inventario-drawer">

            <div className="inventario-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DE CATEGORÍA
                </p>

                <h2>
                  {categoriaSeleccionada.nombre}
                </h2>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={cerrarDetalleCategoria}
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div
              className={`inventario-drawer-status ${
                categoriaSeleccionada.activo
                  ? "activo"
                  : "inactivo"
              }`}
            >
              <span>
                Estado
              </span>

              <strong>
                {categoriaSeleccionada.activo
                  ? "Activa"
                  : "Inactiva"}
              </strong>
            </div>

            <div className="categoria-drawer-description">

              <span>
                Descripción
              </span>

              <p>
                {categoriaSeleccionada.descripcion}
              </p>

            </div>

            <div className="categoria-drawer-info">

              <span>
                Productos asociados
              </span>

              <strong>
                {
                  productos.filter(
                    (producto) =>
                      producto.categoria ===
                      categoriaSeleccionada.nombre
                  ).length
                }
              </strong>

            </div>

            <div className="inventario-drawer-actions">

              <button
                type="button"
                className="drawer-primary-button"
              >
                <Pencil
                  size={17}
                  strokeWidth={1.9}
                />

                Editar categoría
              </button>

              <button
                type="button"
                className="drawer-secondary-button"
                onClick={() =>
                  cambiarEstadoCategoria(
                    categoriaSeleccionada.id
                  )
                }
              >
                {categoriaSeleccionada.activo ? (
                  <PowerOff
                    size={17}
                    strokeWidth={1.9}
                  />
                ) : (
                  <Power
                    size={17}
                    strokeWidth={1.9}
                  />
                )}

                {categoriaSeleccionada.activo
                  ? "Desactivar categoría"
                  : "Activar categoría"}
              </button>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default InventarioPage;