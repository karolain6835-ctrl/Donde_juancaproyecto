import { useEffect, useMemo, useState } from "react";



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

  Trash2,
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



  // ==========================================

  // PRODUCTOS DESDE BACKEND

  // ==========================================

  const [productos, setProductos] = useState([]);

  const [cargandoProductos, setCargandoProductos] = useState(true);

  const [errorProductos, setErrorProductos] = useState("");

  const [mostrarFormularioProducto, setMostrarFormularioProducto] = useState(false);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [eliminandoProducto, setEliminandoProducto] = useState(false);
  const [productoEditandoId, setProductoEditandoId] = useState(null);
  const [mensajeProducto, setMensajeProducto] = useState("");
  const [errorFormularioProducto, setErrorFormularioProducto] = useState("");

  const [formProducto, setFormProducto] = useState({
    nombre: "",
    codigo: "",
    precio_venta: "",
    costo_promedio: "",
    cantidad: "",
    stock_minimo: "",
    categorias_id: "1",
    proveedores_id: "prov-001",
    historial_costos_id: "hist-001",
    estado: "activo",
  });



  useEffect(() => {

    cargarProductos();

  }, []);



  async function cargarProductos() {

    try {

      setCargandoProductos(true);

      setErrorProductos("");



      const respuesta = await fetch(

        "http://localhost:5000/api/productos"

      );



      const datos = await respuesta.json();



      if (!respuesta.ok) {

        throw new Error(

          datos.error || "No se pudieron cargar los productos."

        );

      }



      const productosAdaptados = (datos.datos || []).map((producto) => {

        const stock = Number(producto.cantidad_disponible || 0);

        const minimo = Number(producto.stock_minimo || 0);



        let estadoStock = "normal";



        if (stock <= 0) {

          estadoStock = "agotado";

        } else if (stock <= minimo / 2) {

          estadoStock = "critico";

        } else if (stock <= minimo) {

          estadoStock = "bajo";

        }



        return {

          id: producto.id,

          codigo: producto.codigo,

          nombre: producto.nombre,

          categoria: producto.categoria_nombre || "Sin categoría",

          stock,

          minimo,

          costo: Number(

            producto.costo_promedio_ponderado || 0

          ),

          precio: Number(producto.precio_venta || 0),

          activo: producto.estado === "activo",

          estadoStock,



          // Datos reales para futuras acciones de edición

          categorias_id: producto.categorias_id,

          proveedores_id: producto.proveedores_id,

          historial_costos_id: producto.historial_costos_id,

        };

      });



      setProductos(productosAdaptados);

    } catch (error) {

      console.error("Error al cargar productos:", error);

      setErrorProductos(error.message);

    } finally {

      setCargandoProductos(false);

    }

  }



  // ==========================================

  // CATEGORÍAS TEMPORALES DEL FRONTEND

  // ==========================================

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



  // ==========================================

  // FILTROS DE PRODUCTOS

  // ==========================================

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

  }, [productos, busqueda, filtroEstado]);



  // ==========================================

  // FILTROS DE CATEGORÍAS

  // ==========================================

  const categoriasFiltradas = useMemo(() => {

    const texto = busqueda.toLowerCase();



    return categorias.filter(

      (categoria) =>

        categoria.nombre.toLowerCase().includes(texto) ||

        categoria.descripcion.toLowerCase().includes(texto)

    );

  }, [busqueda, categorias]);



  // ==========================================

  // KPIs

  // ==========================================

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



  // ==========================================

  // UTILIDADES

  // ==========================================

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



  function abrirNuevoProducto() {
    setProductoEditandoId(null);
    setMensajeProducto("");
    setErrorFormularioProducto("");

    setFormProducto({
      nombre: "",
      codigo: "",
      precio_venta: "",
      costo_promedio: "",
      cantidad: "",
      stock_minimo: "",
      categorias_id: "1",
      proveedores_id: "prov-001",
      historial_costos_id: "hist-001",
      estado: "activo",
    });

    setMostrarFormularioProducto(true);
  }

  function abrirEditarProducto(producto) {
    setProductoSeleccionado(null);
    setProductoEditandoId(producto.id);
    setMensajeProducto("");
    setErrorFormularioProducto("");

    setFormProducto({
      nombre: producto.nombre || "",
      codigo: producto.codigo || "",
      precio_venta: producto.precio ?? "",
      costo_promedio: producto.costo ?? "",
      cantidad: producto.stock ?? "",
      stock_minimo: producto.minimo ?? "",
      categorias_id: String(producto.categorias_id || "1"),
      proveedores_id: producto.proveedores_id || "prov-001",
      historial_costos_id:
        producto.historial_costos_id || "hist-001",
      estado: producto.activo ? "activo" : "inactivo",
    });

    setMostrarFormularioProducto(true);
  }

  function cerrarFormularioProducto() {
    if (guardandoProducto) return;

    setMostrarFormularioProducto(false);
    setProductoEditandoId(null);
    setErrorFormularioProducto("");
  }

  function cambiarCampoProducto(event) {
    const { name, value } = event.target;

    setFormProducto((formActual) => ({
      ...formActual,
      [name]: value,
    }));
  }

  async function guardarProducto(event) {
    event.preventDefault();

    try {
      setGuardandoProducto(true);
      setErrorFormularioProducto("");
      setMensajeProducto("");

      const esEdicion = Boolean(productoEditandoId);

      const url = esEdicion
        ? `http://localhost:5000/api/productos/${productoEditandoId}`
        : "http://localhost:5000/api/productos";

      const metodo = esEdicion ? "PUT" : "POST";

      const cuerpo = {
        nombre: formProducto.nombre.trim(),
        codigo: formProducto.codigo.trim(),
        precio_venta: Number(formProducto.precio_venta),
        costo_promedio: Number(formProducto.costo_promedio),
        cantidad: Number(formProducto.cantidad),
        stock_minimo: Number(formProducto.stock_minimo),
        categorias_id: formProducto.categorias_id,
        proveedores_id: formProducto.proveedores_id,
        historial_costos_id: formProducto.historial_costos_id,
      };

      if (esEdicion) {
        cuerpo.estado = formProducto.estado;
      }

      const respuesta = await fetch(url, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cuerpo),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            datos.mensaje ||
            (esEdicion
              ? "No se pudo actualizar el producto."
              : "No se pudo crear el producto.")
        );
      }

      setMensajeProducto(
        esEdicion
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente."
      );

      setMostrarFormularioProducto(false);
      setProductoEditandoId(null);

      await cargarProductos();
    } catch (error) {
      console.error(
        productoEditandoId
          ? "Error al actualizar producto:"
          : "Error al crear producto:",
        error
      );

      setErrorFormularioProducto(error.message);
    } finally {
      setGuardandoProducto(false);
    }
  }

  async function eliminarProducto(producto) {
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    try {
      setEliminandoProducto(true);
      setMensajeProducto("");
      setErrorProductos("");

      const respuesta = await fetch(
        `http://localhost:5000/api/productos/${producto.id}`,
        {
          method: "DELETE",
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            datos.mensaje ||
            "No se pudo eliminar el producto."
        );
      }

      setProductoSeleccionado(null);
      setMensajeProducto("Producto eliminado correctamente.");

      await cargarProductos();
    } catch (error) {
      console.error("Error al eliminar producto:", error);

      alert(
        error.message ||
          "No se pudo eliminar el producto."
      );
    } finally {
      setEliminandoProducto(false);
    }
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

          <p className="page-eyebrow">INVENTARIO</p>



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
            onClick={abrirNuevoProducto}

          >

            <Plus size={18} strokeWidth={1.9} />

            Nuevo producto

          </button>

        )}



        {seccionActiva === "categorias" && (

          <button

            type="button"

            className="primary-button inventario-primary-action"

          >

            <Plus size={18} strokeWidth={1.9} />

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

              onClick={() => setFiltroEstado("todos")}

            >

              <div className="inventario-kpi-icon references">

                <Boxes size={20} strokeWidth={1.9} />

              </div>



              <span>Referencias</span>

              <strong>{totalReferencias}</strong>

              <small>Productos registrados</small>

            </button>



            <button

              type="button"

              className={`inventario-kpi ${

                filtroEstado === "bajo"

                  ? "selected"

                  : ""

              }`}

              onClick={() => setFiltroEstado("bajo")}

            >

              <div className="inventario-kpi-icon warning">

                <TriangleAlert size={20} strokeWidth={1.9} />

              </div>



              <span>Con stock bajo</span>

              <strong>{stockBajo}</strong>

              <small className="inventario-warning">

                Requieren reposición

              </small>

            </button>



            <article className="inventario-kpi">

              <div className="inventario-kpi-icon value">

                <BadgeDollarSign size={20} strokeWidth={1.9} />

              </div>



              <span>Valor estimado</span>

              <strong>

                {formatearDinero(valorInventario)}

              </strong>

              <small>Según costo registrado</small>

            </article>



            <button

              type="button"

              className={`inventario-kpi alert ${

                filtroEstado === "agotado"

                  ? "selected"

                  : ""

              }`}

              onClick={() => setFiltroEstado("agotado")}

            >

              <div className="inventario-kpi-icon danger">

                <PackageX size={20} strokeWidth={1.9} />

              </div>



              <span>Agotados</span>

              <strong>{agotados}</strong>

              <small>Sin existencias</small>

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

                onClick={() => setFiltroEstado("todos")}

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

                onClick={() => setFiltroEstado("normal")}

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

                onClick={() => setFiltroEstado("bajo")}

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

                onClick={() => setFiltroEstado("critico")}

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

                onClick={() => setFiltroEstado("agotado")}

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

              onClick={() => setFiltroEstado("todos")}

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

              onClick={() => setFiltroEstado("normal")}

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

              onClick={() => setFiltroEstado("bajo")}

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

              onClick={() => setFiltroEstado("agotado")}

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



            {mensajeProducto && (
        <section
          className="inventario-empty-section"
          style={{
            minHeight: "auto",
            padding: "16px",
            marginBottom: "18px",
          }}
        >
          <p
            style={{
              color: "var(--color-success)",
              fontWeight: 700,
            }}
          >
            {mensajeProducto}
          </p>
        </section>
      )}

{/* =========================

          ESTADO DE CARGA

      ========================= */}



      {(seccionActiva === "resumen" ||

        seccionActiva === "productos") &&

        cargandoProductos && (

          <section className="inventario-empty-section">

            <h2>Cargando productos...</h2>

            <p>

              Consultando información desde la base de datos.

            </p>

          </section>

        )}



      {(seccionActiva === "resumen" ||

        seccionActiva === "productos") &&

        !cargandoProductos &&

        errorProductos && (

          <section className="inventario-empty-section">

            <h2>No se pudieron cargar los productos</h2>

            <p>{errorProductos}</p>

          </section>

        )}



      {/* =========================

          TABLA PRODUCTOS

      ========================= */}



      {(seccionActiva === "resumen" ||

        seccionActiva === "productos") &&

        !cargandoProductos &&

        !errorProductos && (

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

                        <strong>{producto.nombre}</strong>

                      </td>



                      <td>{producto.categoria}</td>



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



                  {productosFiltrados.length === 0 && (

                    <tr>

                      <td colSpan="9">

                        No hay productos para mostrar.

                      </td>

                    </tr>

                  )}

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

                    <h3>{categoria.nombre}</h3>



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



                <p>{categoria.descripcion}</p>



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
          FORMULARIO NUEVO PRODUCTO
      ========================= */}

      {mostrarFormularioProducto && (
        <>
          <div
            className="inventario-overlay"
            onClick={cerrarFormularioProducto}
          ></div>

          <aside className="inventario-drawer">
            <div className="inventario-drawer-header">
              <div>
                <p className="page-eyebrow">
                  {productoEditandoId
                    ? "EDITAR PRODUCTO"
                    : "NUEVO PRODUCTO"}
                </p>

                <h2>
                  {productoEditandoId
                    ? "Actualizar producto"
                    : "Registrar producto"}
                </h2>

                <span>
                  {productoEditandoId
                    ? "Los cambios se guardarán directamente en la base de datos."
                    : "Se guardará directamente en la base de datos."}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={cerrarFormularioProducto}
                aria-label="Cerrar formulario"
              >
                <X size={20} strokeWidth={1.9} />
              </button>
            </div>

            <form
              onSubmit={guardarProducto}
              style={{
                display: "grid",
                gap: "14px",
                marginTop: "22px",
              }}
            >
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>
                  Nombre
                </span>

                <input
                  type="text"
                  name="nombre"
                  value={formProducto.nombre}
                  onChange={cambiarCampoProducto}
                  placeholder="Ej. Cerveza Águila 330ml"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    font: "inherit",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>
                  Código
                </span>

                <input
                  type="text"
                  name="codigo"
                  value={formProducto.codigo}
                  onChange={cambiarCampoProducto}
                  placeholder="Ej. CERV-002"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    font: "inherit",
                  }}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    Precio de venta
                  </span>

                  <input
                    type="number"
                    name="precio_venta"
                    min="0"
                    value={formProducto.precio_venta}
                    onChange={cambiarCampoProducto}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      font: "inherit",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    Costo promedio
                  </span>

                  <input
                    type="number"
                    name="costo_promedio"
                    min="0"
                    value={formProducto.costo_promedio}
                    onChange={cambiarCampoProducto}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      font: "inherit",
                    }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    Cantidad inicial
                  </span>

                  <input
                    type="number"
                    name="cantidad"
                    min="0"
                    value={formProducto.cantidad}
                    onChange={cambiarCampoProducto}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      font: "inherit",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    Stock mínimo
                  </span>

                  <input
                    type="number"
                    name="stock_minimo"
                    min="0"
                    value={formProducto.stock_minimo}
                    onChange={cambiarCampoProducto}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      font: "inherit",
                    }}
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>
                  Categoría
                </span>

                <select
                  name="categorias_id"
                  value={formProducto.categorias_id}
                  onChange={cambiarCampoProducto}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    background: "white",
                    font: "inherit",
                  }}
                >
                  <option value="1">Cervezas</option>
                  <option value="2">Licores</option>
                  <option value="3">Bebidas sin alcohol</option>
                  <option value="4">Snacks de Tienda</option>
                  <option value="5">Artículos Varios</option>
                </select>
              </label>

              {productoEditandoId && (
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    Estado del producto
                  </span>

                  <select
                    name="estado"
                    value={formProducto.estado}
                    onChange={cambiarCampoProducto}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      background: "white",
                      font: "inherit",
                    }}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </label>
              )}

              {errorFormularioProducto && (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background: "var(--color-danger-bg)",
                    color: "var(--color-danger)",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {errorFormularioProducto}
                </div>
              )}

              <div className="inventario-drawer-actions">
                <button
                  type="submit"
                  className="drawer-primary-button"
                  disabled={guardandoProducto}
                >
                  <Plus size={17} strokeWidth={1.9} />

                  {guardandoProducto
                    ? "Guardando..."
                    : productoEditandoId
                      ? "Actualizar producto"
                      : "Guardar producto"}
                </button>

                <button
                  type="button"
                  className="drawer-secondary-button"
                  onClick={cerrarFormularioProducto}
                  disabled={guardandoProducto}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </aside>
        </>
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

              <span>Estado del producto</span>



              <strong>

                {productoSeleccionado.activo

                  ? "Activo"

                  : "Inactivo"}

              </strong>

            </div>



            <div className="inventario-detail-grid">

              <div>

                <span>Categoría</span>

                <strong>

                  {productoSeleccionado.categoria}

                </strong>

              </div>



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

                <span>Costo unitario</span>

                <strong>

                  {formatearDinero(

                    productoSeleccionado.costo

                  )}

                </strong>

              </div>



              <div>

                <span>Precio de venta</span>

                <strong>

                  {formatearDinero(

                    productoSeleccionado.precio

                  )}

                </strong>

              </div>



              <div>

                <span>Estado de stock</span>

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
                onClick={() =>
                  abrirEditarProducto(productoSeleccionado)
                }
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
                onClick={() =>
                  eliminarProducto(productoSeleccionado)
                }
                disabled={eliminandoProducto}
                style={{
                  color: "var(--color-danger)",
                }}
              >
                <Trash2
                  size={17}
                  strokeWidth={1.9}
                />

                {eliminandoProducto
                  ? "Eliminando..."
                  : "Eliminar producto"}
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

              <span>Estado</span>



              <strong>

                {categoriaSeleccionada.activo

                  ? "Activa"

                  : "Inactiva"}

              </strong>

            </div>



            <div className="categoria-drawer-description">

              <span>Descripción</span>



              <p>

                {categoriaSeleccionada.descripcion}

              </p>

            </div>



            <div className="categoria-drawer-info">

              <span>Productos asociados</span>



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