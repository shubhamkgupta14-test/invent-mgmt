import { useState } from "react";
import { FaBoxes, FaChartLine, FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/authApi";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { setToken } from "../utils/authUtils";

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
      navigate("/dashboard");
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
    <div className="flex min-h-screen bg-[#f6f7fb]">
      <div
        className="relative hidden overflow-hidden p-12 text-white md:flex md:w-[45%] md:flex-col md:justify-between"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #24184f 52%, #4338ca 100%)",
        }}
      >
        <div>
          <div className="mb-12 flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500 p-2 shadow-lg shadow-indigo-950/30">
              <FaBoxes size={24} />
            </div>
            <h1 className="text-2xl font-bold">HappiHome Inventory</h1>
          </div>

          <h2 className="mb-4 text-4xl font-bold leading-tight">
            Inventory management for every HappiHome shelf.
          </h2>
          <p className="mb-8 max-w-md text-lg text-slate-300">
            Manage products, purchases, sales, and stock levels in one focused
            workspace.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3">
                <FaChartLine className="text-emerald-400" size={18} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Real-time Analytics</p>
                <p className="font-semibold text-slate-200">
                  Track inventory in real time
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-indigo-400/30 bg-indigo-400/10 p-3">
                <FaLock className="text-indigo-300" size={18} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Secure Access</p>
                <p className="font-semibold text-slate-200">
                  Role-based permissions
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <p className="text-sm text-slate-400">
            HappiHome Inventory workspace
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center p-4 sm:p-8 md:w-[55%]">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <div className="rounded-lg bg-indigo-600 p-2">
              <FaBoxes size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              HappiHome Inventory
            </h1>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
            <div>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">
                Welcome Back
              </h2>
              <p className="mb-8 text-slate-600">
                Sign in to manage HappiHome inventory.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                label="Username"
                placeholder="Enter your username"
                type="text"
                value={username}
                onChange={setUsername}
                required
                disabled={loading}
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
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 font-sans text-slate-900 placeholder-slate-400 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition-colors hover:text-slate-700"
                    tabIndex="-1"
                  >
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
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
                className="mt-8 w-full"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-medium text-indigo-700">
                Demo Credentials:
              </p>
              <p className="mt-1 text-xs text-indigo-600">
                Username: <span className="font-mono font-semibold">admin</span>
              </p>
              <p className="text-xs text-indigo-600">
                Password: <span className="font-mono font-semibold">admin123</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
