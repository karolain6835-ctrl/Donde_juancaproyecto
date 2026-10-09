import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout/AdminLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MesasPage from "./pages/MesasPage";
import PedidosPage from "./pages/PedidosPage";
import KanbanPage from "./pages/KanbanPage";
import InventarioPage from "./pages/InventarioPage";
import ComprasPage from "./pages/ComprasPage";
import JuegosPage from "./pages/JuegosPage";
import CajaPage from "./pages/CajaPage";
import ClientesPage from "./pages/ClientesPage";
import ReportesPage from "./pages/ReportesPage";
import AdministracionPage from "./pages/AdministracionPage";

function App() {
  return (
    <Routes>

      {/* INICIO DE SESIÓN */}
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* ENTRADA PRINCIPAL */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* SISTEMA ADMINISTRATIVO */}
      <Route
        path="/*"
        element={
          <AdminLayout>
            <Routes>

              <Route
                path="/dashboard"
                element={<DashboardPage />}
              />

              <Route
                path="/operacion/mesas"
                element={<MesasPage />}
              />

              <Route
                path="/operacion/pedidos"
                element={<PedidosPage />}
              />

              <Route
                path="/operacion/kanban"
                element={<KanbanPage />}
              />

              <Route
                path="/inventario"
                element={<InventarioPage />}
              />

              <Route
                path="/compras"
                element={<ComprasPage />}
              />

              <Route
                path="/juegos"
                element={<JuegosPage />}
              />

              <Route
                path="/caja"
                element={<CajaPage />}
              />

              <Route
                path="/clientes"
                element={<ClientesPage />}
              />

              <Route
                path="/reportes"
                element={<ReportesPage />}
              />

              <Route
                path="/administracion"
                element={<AdministracionPage />}
              />

              <Route
                path="*"
                element={
                  <Navigate
                    to="/dashboard"
                    replace
                  />
                }
              />

            </Routes>
          </AdminLayout>
        }
      />

    </Routes>
  );
}

export default App;