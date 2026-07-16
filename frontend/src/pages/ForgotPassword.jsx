import { useState } from "react";
import { Link } from "react-router-dom";
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

function ForgotPassword() {
  const [step, setStep] = useState("request");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const { brand } = useCompanySettings();

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
      setDevOtp(response.data?.data?.dev_otp || "");
      setMessage(response.data?.message || "If the account exists, an OTP has been sent.");
      setStep("otp");
    } catch (error) {
      setError(error.response?.data?.message || "Unable to request OTP.");
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
      setMessage("OTP verified. Set a new password.");
      setStep("password");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Invalid or expired OTP.";
      setError(errorMessage);
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

    try {
      setLoading(true);
      await confirmPasswordReset(resetToken, newPassword);
      setMessage("Password updated. You can sign in now.");
      setStep("done");
    } catch (error) {
      setError(error.response?.data?.message || "Unable to update password.");
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
          </form>
        )}

        {step === "password" && (
          <form onSubmit={submitPassword} className="space-y-5">
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              disabled={loading}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={loading}
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
