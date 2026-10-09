import { useState } from "react";

import {
  BarChart3,
  Boxes,
  PackageSearch,
  Gamepad2,
  WalletCards,
} from "lucide-react";

import ReporteVentasSection from "../components/ReporteVentasSection";
import ReporteInventarioSection from "../components/ReporteInventarioSection";
import ReporteProductosSection from "../components/ReporteProductosSection";
import ReporteJuegosSection from "../components/ReporteJuegosSection";
import ReporteCajaSection from "../components/ReporteCajaSection";

import "./ReportesPage.css";

function ReportesPage() {
  const [seccionActiva, setSeccionActiva] = useState("ventas");

  return (
    <div className="reportes-page">

      <header className="reportes-header">

        <div>
          <p className="page-eyebrow">
            REPORTES
          </p>

          <h1 className="page-title">
            {seccionActiva === "ventas" && "Ventas"}
            {seccionActiva === "inventario" && "Inventario"}
            {seccionActiva === "productos" && "Productos más vendidos"}
            {seccionActiva === "juegos" && "Juegos"}
            {seccionActiva === "caja" && "Caja"}
          </h1>

          <p className="page-description">
            Analiza el desempeño operativo y comercial de Donde Juanca.
          </p>
        </div>

      </header>

      <nav className="reportes-nav">

        <button
          type="button"
          className={seccionActiva === "ventas" ? "active" : ""}
          onClick={() => setSeccionActiva("ventas")}
        >
          <BarChart3
            size={16}
            strokeWidth={1.9}
          />

          Ventas
        </button>

        <button
          type="button"
          className={seccionActiva === "inventario" ? "active" : ""}
          onClick={() => setSeccionActiva("inventario")}
        >
          <Boxes
            size={16}
            strokeWidth={1.9}
          />

          Inventario
        </button>

        <button
          type="button"
          className={seccionActiva === "productos" ? "active" : ""}
          onClick={() => setSeccionActiva("productos")}
        >
          <PackageSearch
            size={16}
            strokeWidth={1.9}
          />

          Productos más vendidos
        </button>

        <button
          type="button"
          className={seccionActiva === "juegos" ? "active" : ""}
          onClick={() => setSeccionActiva("juegos")}
        >
          <Gamepad2
            size={16}
            strokeWidth={1.9}
          />

          Juegos
        </button>

        <button
          type="button"
          className={seccionActiva === "caja" ? "active" : ""}
          onClick={() => setSeccionActiva("caja")}
        >
          <WalletCards
            size={16}
            strokeWidth={1.9}
          />

          Caja
        </button>

      </nav>

      {seccionActiva === "ventas" && (
        <ReporteVentasSection />
      )}

      {seccionActiva === "inventario" && (
        <ReporteInventarioSection />
      )}

      {seccionActiva === "productos" && (
        <ReporteProductosSection />
      )}

      {seccionActiva === "juegos" && (
        <ReporteJuegosSection />
      )}

      {seccionActiva === "caja" && (
        <ReporteCajaSection />
      )}

    </div>
  );
}

export default ReportesPage;