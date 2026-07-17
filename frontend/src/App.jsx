import { useEffect, useState } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
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
import Maintenance from "./pages/Maintenance";
import Loader from "./components/common/Loader";
import { getMaintenanceStatus } from "./api/maintenanceApi";
import { getStoredUser } from "./utils/authUtils";
import AdminPortalGuard from "./routes/AdminPortalGuard";
import { ADMIN_PORTAL_BASE } from "./config/appConfig";
import { getAdminAccessStatus } from "./api/adminAccessApi";

function App() {
  useCompanySettings();
  const location = useLocation();
  const [maintenance, setMaintenance] = useState(null);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  const [adminPortalPath, setAdminPortalPath] = useState("");
  const isSuperadmin = String(getStoredUser()?.role || "").toLowerCase() === "superadmin";

  useEffect(() => {
    let active = true;
    getMaintenanceStatus()
      .then((response) => {
        if (active) setMaintenance(response.data?.data || null);
      })
      .catch(() => {
        if (active) setMaintenance(null);
      })
      .finally(() => {
        if (active) setCheckingMaintenance(false);
      });

    const handleMaintenance = (event) => setMaintenance(event.detail);
    window.addEventListener("maintenance:enabled", handleMaintenance);
    window.addEventListener("maintenance:changed", handleMaintenance);
    return () => {
      active = false;
      window.removeEventListener("maintenance:enabled", handleMaintenance);
      window.removeEventListener("maintenance:changed", handleMaintenance);
    };
  }, []);

  useEffect(() => {
    if (!maintenance?.active || !isSuperadmin) {
      setAdminPortalPath("");
      return;
    }
    let active = true;
    getAdminAccessStatus()
      .then((response) => {
        if (active) {
          setAdminPortalPath(
            `${ADMIN_PORTAL_BASE}/${response.data.data.portal_key}`,
          );
        }
      })
      .catch(() => {
        if (active) setAdminPortalPath("");
      });
    return () => { active = false; };
  }, [maintenance?.active, isSuperadmin]);

  if (checkingMaintenance) return <Loader message="Checking service status..." />;

  const isAdminPortal = location.pathname.startsWith(`${ADMIN_PORTAL_BASE}/`);
  const adminLoginRequested =
    location.pathname === "/" &&
    new URLSearchParams(location.search).get("maintenanceAdmin") === "1";
  if (maintenance?.active && isSuperadmin && !isAdminPortal) {
    if (!adminPortalPath) return <Loader message="Opening administration portal..." />;
    return <Navigate to={`${adminPortalPath}?entry=1`} replace />;
  }
  if (maintenance?.active && !isSuperadmin && !adminLoginRequested) {
    return <Maintenance config={maintenance} />;
  }

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
          path={`${ADMIN_PORTAL_BASE}/:portalKey/*`}
          element={
            <ProtectedRoute>
              <AdminPortalGuard>
                <SuperAdmin />
              </AdminPortalGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audits"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/api-logs"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
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
