import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCompanySettings } from "../api/companyApi";
import { getMyDetails } from "../api/userApi";
import { getCsrfToken } from "../api/authApi";
import { setCsrfToken } from "../utils/authUtils";
import Loader from "../components/common/Loader";

function ProtectedRoute({ children }) {
  const [authState, setAuthState] = useState("checking");

  useEffect(() => {
    let active = true;
    Promise.all([getMyDetails({ force: true }), getCsrfToken()])
      .then(([, csrfResponse]) => {
        if (!active) return;
        setCsrfToken(csrfResponse.data?.data?.csrf_token);
        setAuthState("authenticated");
        getCompanySettings().catch(() => {});
      })
      .catch(() => {
        if (active) setAuthState("unauthenticated");
      });
    return () => { active = false; };
  }, []);

  if (authState === "checking") {
    return <Loader message="Checking session..." />;
  }

  if (authState === "unauthenticated") {
    return <Navigate to="/" />;
  }

  return children;
}

export default ProtectedRoute;
