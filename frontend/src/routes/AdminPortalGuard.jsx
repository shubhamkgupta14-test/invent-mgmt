import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { FaCheck, FaCopy, FaShieldAlt } from "react-icons/fa";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import { getStoredUser } from "../utils/authUtils";
import {
  beginAdminAccess,
  getAdminAccessStatus,
  requestAdminOtp,
  verifyAdminOtp,
} from "../api/adminAccessApi";

function AdminPortalGuard({ children }) {
  const { portalKey } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [otpCopied, setOtpCopied] = useState(false);
  const isSuperadmin =
    String(getStoredUser()?.role || "").toLowerCase() === "superadmin";

  const sendOtp = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await requestAdminOtp();
      const data = response.data.data;
      setMessage(`A verification code was sent to ${data.masked_email}.`);
      setDevOtp(data.dev_otp || "");
      setOtpCopied(false);
      setStatus("challenge");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send verification code");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!isSuperadmin) {
      setStatus("denied");
      return;
    }
    const isFreshEntry =
      new URLSearchParams(location.search).get("entry") === "1";
    const statusRequest = isFreshEntry
      ? beginAdminAccess()
      : getAdminAccessStatus();

    statusRequest
      .then((response) => {
        const data = response.data.data;
        if (data.portal_key !== portalKey) {
          setStatus("denied");
          return;
        }
        setStatus(data.verified ? "verified" : "ready");
        if (isFreshEntry) {
          const params = new URLSearchParams(location.search);
          params.delete("entry");
          navigate(
            `${location.pathname}${params.size ? `?${params.toString()}` : ""}`,
            { replace: true },
          );
        }
      })
      .catch(() => setStatus("denied"));
  }, [isSuperadmin, portalKey]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await verifyAdminOtp(otp);
      setStatus("verified");
    } catch (verifyError) {
      setError(verifyError.response?.data?.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const copyDevOtp = async () => {
    await navigator.clipboard.writeText(devOtp);
    setOtpCopied(true);
    window.setTimeout(() => setOtpCopied(false), 1500);
  };

  if (status === "checking") return <Loader message="Checking administration access..." />;
  if (status === "denied") return <Navigate to="/dashboard" replace />;
  if (status === "verified") return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <FaShieldAlt size={28} />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-slate-900">
          Administration verification
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-600">
          Verify your identity before entering the protected administration portal.
        </p>

        {status === "ready" ? (
          <Button className="mt-6 w-full" onClick={sendOtp} loading={busy}>
            Send verification code
          </Button>
        ) : (
          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <p className="text-center text-sm text-slate-600">{message}</p>
            {devOtp && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                <span>Development OTP: {devOtp}</span>
                <button
                  type="button"
                  onClick={copyDevOtp}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-amber-800 shadow-sm transition hover:bg-amber-100"
                  aria-label="Copy development OTP"
                >
                  {otpCopied ? <FaCheck size={11} /> : <FaCopy size={11} />}
                  {otpCopied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
            <Input
              label="Six-digit code"
              value={otp}
              onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
            <Button className="w-full" type="submit" loading={busy} disabled={otp.length !== 6}>
              Verify and continue
            </Button>
            <Button className="w-full" type="button" variant="secondary" onClick={sendOtp} disabled={busy}>
              Resend code
            </Button>
          </form>
        )}
        {error && <p className="mt-4 text-center text-sm font-medium text-rose-600">{error}</p>}
      </section>
    </main>
  );
}

export default AdminPortalGuard;
