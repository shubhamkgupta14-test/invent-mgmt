import { FaTools } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import useCompanySettings from "../hooks/useCompanySettings";
import { formatDateTimeIST } from "../utils/formatters";

function Maintenance({ config }) {
  const navigate = useNavigate();
  const { brand } = useCompanySettings();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white p-8 text-center shadow-2xl sm:p-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600">
          <FaTools size={34} />
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">
          {brand.name}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          We’ll be back shortly
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          {config?.message || "We are performing scheduled maintenance. Please try again shortly."}
        </p>
        {config?.ends_at && (
          <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            Expected completion: {formatDateTimeIST(config.ends_at)}
          </p>
        )}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={() => window.location.reload()}>
            Check Again
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/?maintenanceAdmin=1")}
          >
            Administrator Sign In
          </Button>
        </div>
      </section>
    </main>
  );
}

export default Maintenance;

