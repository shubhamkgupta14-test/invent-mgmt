import { useState } from "react";
import { FaBoxes, FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/authApi";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import {
  clearLastPath,
  getLastPath,
  getUserFromToken,
  setStoredUser,
  setToken,
} from "../utils/authUtils";
import { APP_TITLE, BRAND_NAME } from "../config/brand";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }

    try {
      setLoading(true);
      const response = await loginUser({ username, password });
      const authData = response.data?.data || response.data;
      const token = authData?.access_token;
      const expiresIn = authData?.expires_in || 3600;

      if (!token) {
        throw new Error("Login succeeded but no token was returned.");
      }

      setToken(token, expiresIn);
      setStoredUser(getUserFromToken(token));
      const nextPath = getLastPath();
      clearLastPath();
      navigate(nextPath);
    } catch (error) {
      const apiError = error.response?.data;

      if (
        apiError?.data &&
        Array.isArray(apiError.data) &&
        apiError.data.length > 0
      ) {
        const field = apiError.data[0].field;
        if (field.includes("username")) {
          setError("Username is required");
        } else if (field.includes("password")) {
          setError("Password is required");
        } else {
          setError(apiError.data[0].message);
        }
      } else if (apiError?.message) {
        setError(apiError.message);
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)",
      }}
    >
      <div className="relative hidden overflow-hidden p-12 text-white lg:flex lg:w-[45%] lg:flex-col lg:justify-between">
        <div>
          <div className="mb-12 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500 p-2 shadow-xl shadow-indigo-950/50">
              <FaBoxes size={24} />
            </div>
            <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
          </div>

          <h2 className="mb-4 text-4xl font-bold leading-tight">
            Inventory management for every {BRAND_NAME} shelf.
          </h2>
          <p className="mb-8 max-w-md text-lg text-slate-300">
            Manage products, purchases, sales, and stock levels in one focused
            workspace.
          </p>

          <div className="mt-8 flex gap-3">
            {[
              { label: "Products tracked", value: "8K+" },
              { label: "Orders daily", value: "200+" },
              { label: "Uptime", value: "99.9%" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur"
              >
                <div className="font-mono text-xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="mt-0.5 text-xs text-indigo-200/60">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-indigo-300/40">
            {APP_TITLE} workspace
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white p-8 shadow-2xl lg:p-10">
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <div className="rounded-lg bg-indigo-500 p-2">
                <FaBoxes size={18} className="text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                {APP_TITLE}
              </h1>
            </div>
            <div>
              <h2 className="mb-1.5 text-2xl font-bold text-slate-900">
                Welcome back
              </h2>
              <p className="mb-8 text-sm text-slate-600">
                Sign in to your inventory workspace.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <Input
                label="Username"
                placeholder="Enter your username"
                type="text"
                value={username}
                onChange={setUsername}
                required
                disabled={loading}
                className="bg-slate-50 py-3 text-sm placeholder:text-slate-300"
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3 font-sans text-sm text-slate-900 placeholder-slate-300 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition-colors hover:text-slate-700"
                    tabIndex="-1"
                  >
                    {showPassword ? (
                      <FaEyeSlash size={18} />
                    ) : (
                      <FaEye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="mt-0.5 text-rose-600">
                    <FaLock size={14} />
                  </div>
                  <p className="text-sm font-medium text-rose-700">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                disabled={loading}
                className="mt-7 w-full py-3"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
