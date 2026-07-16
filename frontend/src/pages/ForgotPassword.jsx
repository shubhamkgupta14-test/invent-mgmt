import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import {
  confirmPasswordReset,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
} from "../api/authApi";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import DevOtpPanel from "../components/common/DevOtpPanel";
import useCompanySettings from "../hooks/useCompanySettings";
const sanitizeOtp = (value) => value.replace(/\D/g, "").slice(0, 6);
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

const formatCountdown = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getInlineError = (error, fallback) => {
  const apiMessage = error?.response?.data?.message;
  if (typeof apiMessage === "string") return apiMessage;
  if (apiMessage && typeof apiMessage === "object") {
    const descriptions = Array.isArray(apiMessage.description)
      ? apiMessage.description
      : apiMessage.description ? [apiMessage.description] : [];
    return descriptions.length
      ? `${apiMessage.title || "Validation failed"}: ${descriptions.join(" ")}`
      : apiMessage.title || fallback;
  }
  return fallback;
};

const validatePassword = (password) => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be 128 characters or fewer.";
  if (!/[A-Za-z]/.test(password)) return "Password must contain at least one letter.";
  if (!/\d/.test(password)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character.";
  return "";
};

function ForgotPassword() {
  const [step, setStep] = useState("request");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const { brand } = useCompanySettings();

  useEffect(() => {
    if (step !== "otp" || resendCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown, step]);

  const applyOtpResponse = (response) => {
    setDevOtp(response.data?.data?.dev_otp || "");
    setResendCooldown(
      Number(response.data?.data?.resend_cooldown_seconds) ||
        DEFAULT_RESEND_COOLDOWN_SECONDS,
    );
    setMessage(response.data?.message || "If the account exists, an OTP has been sent.");
  };

  const submitIdentifier = async (event) => {
    event.preventDefault();
    setError("");
    setOtpError("");
    setMessage("");

    if (!identifier.trim()) {
      setError("Enter your username or email.");
      return;
    }

    try {
      setLoading(true);
      const response = await requestPasswordResetOtp(identifier.trim());
      applyOtpResponse(response);
      setStep("otp");
    } catch (error) {
      setError(getInlineError(error, "Unable to request OTP."));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (loading || resendCooldown > 0) return;
    setError("");
    setOtpError("");
    setMessage("");
    try {
      setLoading(true);
      const response = await requestPasswordResetOtp(identifier.trim());
      applyOtpResponse(response);
      setOtp("");
    } catch (error) {
      setError(getInlineError(error, "Unable to resend OTP."));
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    setError("");
    setOtpError("");
    setMessage("");

    if (!otp.trim()) {
      setOtpError("Verification code is required.");
      return;
    }

    try {
      setLoading(true);
      const response = await verifyPasswordResetOtp(identifier.trim(), otp.trim());
      setResetToken(response.data?.data?.reset_token || "");
      setDevOtp("");
      setResendCooldown(0);
      setMessage("OTP verified. Set a new password.");
      setStep("password");
    } catch (error) {
      setError(getInlineError(error, "Invalid or expired OTP."));
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setLoading(true);
      await confirmPasswordReset(resetToken, newPassword);
      setMessage("Password updated. You can sign in now.");
      setStep("done");
    } catch (error) {
      setError(getInlineError(error, "Unable to update password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-sm font-semibold text-indigo-700">{brand.title}</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Use your username or email. We will send a one-time code to the registered email.
          </p>
        </div>

        {step === "request" && (
          <form onSubmit={submitIdentifier} className="space-y-5">
            <Input
              label="Username or email"
              value={identifier}
              onChange={setIdentifier}
              placeholder="admin@example.com"
              disabled={loading}
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Send verification code
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={submitOtp} className="space-y-5" noValidate>
            <DevOtpPanel otp={devOtp} />
            <Input
              label="Verification code"
              value={otp}
              onChange={(value) => {
                setOtp(sanitizeOtp(value));
                if (otpError) setOtpError("");
              }}
              error={otpError}
              placeholder="6-digit code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              disabled={loading}
              required
            />
            <p className="-mt-3 text-xs font-medium text-slate-500">
              Maximum 5 attempts.
            </p>
            <Button type="submit" className="w-full" loading={loading}>
              Verify code
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={resendOtp}
              disabled={loading || resendCooldown > 0}
            >
              {resendCooldown > 0
                ? `Resend code in ${formatCountdown(resendCooldown)}`
                : "Resend verification code"}
            </Button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={submitPassword} className="space-y-5">
            <Input
              label="New password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={setNewPassword}
              disabled={loading}
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="rounded-md p-1 text-slate-500 transition hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <FaEyeSlash size={17} /> : <FaEye size={17} />}
                </button>
              }
              required
            />
            <Input
              label="Confirm new password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={loading}
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="rounded-md p-1 text-slate-500 transition hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <FaEyeSlash size={17} /> : <FaEye size={17} />}
                </button>
              }
              required
            />
            <p className="-mt-3 text-xs text-slate-500">At least 8 characters with one letter, one number, and one special character.</p>
            <Button type="submit" className="w-full" loading={loading}>
              Update password
            </Button>
          </form>
        )}

        {step === "done" && (
          <Link
            to="/"
            className="block rounded-xl bg-[var(--primary)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Back to sign in
          </Link>
        )}

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <Link to="/" className="mt-6 block text-center text-sm font-semibold text-slate-600 hover:text-indigo-700">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}

export default ForgotPassword;
