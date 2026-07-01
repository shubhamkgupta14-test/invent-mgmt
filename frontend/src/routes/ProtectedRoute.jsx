import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { getCompanySettings } from "../api/companyApi";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    getCompanySettings().catch(() => {});
  }, [token]);

  if (!token) {
    return <Navigate to="/" />;
  }

  return children;
}

export default ProtectedRoute;
