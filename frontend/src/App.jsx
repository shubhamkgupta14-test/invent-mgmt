import { Navigate, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Purchase from "./pages/Purchase";
import Sale from "./pages/Sale";
import InvoiceGenerator from "./pages/InvoiceGenerator";
import Return from "./pages/Return";
import Exchange from "./pages/Exchange";
import Manufacturing from "./pages/Manufacturing";
import Stock from "./pages/Stock";
import SellingPriceCalculator from "./pages/SellingPriceCalculator";
import Loyalty from "./pages/Loyalty";
import Supplier from "./pages/Supplier";
import SuperAdmin from "./pages/SuperAdmin";
import Notifications from "./pages/Notifications";
import Mailer from "./pages/Mailer";
import UserSettings from "./pages/UserSettings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./routes/ProtectedRoute";
import useCompanySettings from "./hooks/useCompanySettings";
import SessionTimeoutManager from "./components/common/SessionTimeoutManager";

function App() {
  useCompanySettings();

  return (
    <ToastProvider>
      <SessionTimeoutManager />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
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
          path="/selling-price-calculator"
          element={
            <ProtectedRoute>
              <SellingPriceCalculator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty"
          element={
            <ProtectedRoute>
              <Loyalty />
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
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoiceGenerator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/returns"
          element={
            <ProtectedRoute>
              <Return />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exchanges"
          element={
            <ProtectedRoute>
              <Exchange />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturing"
          element={
            <ProtectedRoute>
              <Manufacturing />
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
          path="/mailer"
          element={
            <ProtectedRoute>
              <Mailer />
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
              <Navigate to="/superadmin?tab=audits" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/api-logs"
          element={
            <ProtectedRoute>
              <Navigate to="/superadmin?tab=api-logs" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <UserSettings />
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
