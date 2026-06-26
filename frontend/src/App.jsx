import { Routes, Route } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Purchase from "./pages/Purchase";
import AddPurchase from "./pages/AddPurchase";
import AddProduct from "./pages/AddProduct";
import Sale from "./pages/Sale";
import AddSale from "./pages/AddSale";
import Stock from "./pages/Stock";
import Supplier from "./pages/Supplier";
import SuperAdmin from "./pages/SuperAdmin";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stocks"
          element={
            <ProtectedRoute>
              <Stock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases"
          element={
            <ProtectedRoute>
              <Purchase />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <Sale />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/add"
          element={
            <ProtectedRoute>
              <AddSale />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases/add"
          element={
            <ProtectedRoute>
              <AddPurchase />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/add"
          element={
            <ProtectedRoute>
              <AddProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <Supplier />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute>
              <SuperAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audits"
          element={
            <ProtectedRoute>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <NotFound />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ToastProvider>
  );
}

export default App;
