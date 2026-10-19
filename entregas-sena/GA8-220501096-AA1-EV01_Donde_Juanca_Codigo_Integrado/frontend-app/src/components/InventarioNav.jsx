import { useAuth } from "../context/useAuth";
import { can } from "../utils/permissions";
import {
  LayoutDashboard,
  Boxes,
  Tags,
  Refrigerator,
  ArrowLeftRight,
  TriangleAlert,
  Trash2,
} from "lucide-react";

import "./InventarioNav.css";

function InventarioNav({ seccionActiva, onCambiarSeccion }) {
  const { user } = useAuth();
  const sectionPermissions = { resumen: "productos.ver", productos: "productos.ver", categorias: "categorias.ver", refrigeradores: "inventario.movimientos", movimientos: "inventario.movimientos", alertas: "alertas.ver", mermas: "mermas.ver" };
  const secciones = [
    {
      id: "resumen",
      nombre: "Resumen",
      icono: LayoutDashboard,
    },
    {
      id: "productos",
      nombre: "Productos",
      icono: Boxes,
    },
    {
      id: "categorias",
      nombre: "Categorías",
      icono: Tags,
    },
    {
      id: "refrigeradores",
      nombre: "Refrigeradores",
      icono: Refrigerator,
    },
    {
      id: "movimientos",
      nombre: "Movimientos",
      icono: ArrowLeftRight,
    },
    {
      id: "alertas",
      nombre: "Alertas",
      icono: TriangleAlert,
    },
    {
      id: "mermas",
      nombre: "Mermas",
      icono: Trash2,
    },
  ];

  return (
    <nav
      className="inventario-nav"
      aria-label="Secciones de inventario"
    >
      {secciones.filter(seccion => can(user, sectionPermissions[seccion.id])).map((seccion) => {
        const Icono = seccion.icono;
        const activa = seccionActiva === seccion.id;

        return (
          <button
            key={seccion.id}
            type="button"
            className={`inventario-nav-button ${
              activa ? "active" : ""
            }`}
            onClick={() =>
              onCambiarSeccion(seccion.id)
            }
            aria-current={
              activa ? "page" : undefined
            }
          >
            <Icono
              className="inventario-nav-icon"
              size={17}
              strokeWidth={1.9}
              aria-hidden="true"
            />

            <span>
              {seccion.nombre}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default InventarioNav;