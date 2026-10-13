import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./routes/ProtectedRoute";

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
          <ProtectedRoute>
          <AdminLayout>
            <Routes>

              <Route
                path="/dashboard"
                element={<ProtectedRoute permission="dashboard.ver"><DashboardPage /></ProtectedRoute>}
              />

              <Route
                path="/operacion/mesas"
                element={<ProtectedRoute permission="mesas.ver"><MesasPage /></ProtectedRoute>}
              />

              <Route
                path="/operacion/pedidos"
                element={<ProtectedRoute permission="pedidos.ver"><PedidosPage /></ProtectedRoute>}
              />

              <Route
                path="/operacion/kanban"
                element={<ProtectedRoute permission="kanban.ver"><KanbanPage /></ProtectedRoute>}
              />

              <Route
                path="/inventario"
                element={<ProtectedRoute permission="inventario.ver"><InventarioPage /></ProtectedRoute>}
              />

              <Route
                path="/compras"
                element={<ProtectedRoute permission="compras.ver"><ComprasPage /></ProtectedRoute>}
              />

              <Route
                path="/juegos"
                element={<ProtectedRoute permission="juegos.ver"><JuegosPage /></ProtectedRoute>}
              />

              <Route
                path="/caja"
                element={<ProtectedRoute permission="caja.ver"><CajaPage /></ProtectedRoute>}
              />

              <Route
                path="/clientes"
                element={<ProtectedRoute permission="clientes.ver"><ClientesPage /></ProtectedRoute>}
              />

              <Route
                path="/reportes"
                element={<ProtectedRoute permission="reportes.ver"><ReportesPage /></ProtectedRoute>}
              />

              <Route
                path="/administracion"
                element={<ProtectedRoute permission="administracion.ver"><AdministracionPage /></ProtectedRoute>}
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
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}

export default App;