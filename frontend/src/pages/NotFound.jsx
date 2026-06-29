import { useEffect } from "react";
import { FaArrowLeft, FaHome } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api/apiClient";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import MainLayout from "../layouts/MainLayout";

const reportedNotFoundPaths = new Set();

function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const missingPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (reportedNotFoundPaths.has(missingPath)) return;

    reportedNotFoundPaths.add(missingPath);
    API.get(missingPath).catch(() => {});
  }, [missingPath]);

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
        <Card className="w-full max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-bold text-[var(--primary)]">
            404
          </div>
          <h1 className="mt-6 text-3xl font-bold text-slate-900">
            Page not found
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            The page you are looking for may have been moved, deleted, or never
            existed.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              icon={FaHome}
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={FaArrowLeft}
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

export default NotFound;
