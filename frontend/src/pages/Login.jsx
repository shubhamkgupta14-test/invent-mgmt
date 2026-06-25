import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { loginUser } from "../api/authApi";
import { useNavigate } from "react-router-dom";

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

    try {
      setLoading(true);

      const response = await loginUser({
        username,
        password,
      });

      localStorage.setItem("token", response.data.access_token);

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
          console.log("a");
          setError("* Username is required");
        } else if (field.includes("password")) {
          console.log("b");
          setError("* Password is required");
        } else {
          console.log("c");
          setError(`* ${apiError.data[0].message}`);
        }
      } else {
        console.log("d");
        if (apiError) {
          setError(`* ${apiError?.message}` || "* Login Failed");
        } else {
          setError(`* Something went wrong`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-lg w-96"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Inventory Login</h1>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border p-3 rounded-lg mb-4"
        />

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-3 rounded-lg"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600
                flex items-center justify-center
                "
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`
                w-full p-3 rounded-lg text-white
                ${loading ? "bg-gray-400" : "bg-blue-600"}
            `}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;
