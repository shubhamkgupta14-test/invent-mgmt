import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";

function envPort(value, fallback) {
  const port = Number(value || fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid frontend port: ${value}`);
  }
  return port;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
  plugins: [react(), tailwindcss()],
  server: {
    host: env.VITE_DEV_SERVER_HOST || "localhost",
    port: envPort(env.VITE_DEV_SERVER_PORT, 5173),
    proxy: {
      "/api": {
        target: env.VITE_API_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    },
  },
  preview: {
    host: env.VITE_PREVIEW_SERVER_HOST || "0.0.0.0",
    port: envPort(env.VITE_PREVIEW_SERVER_PORT, 5173),
  },
  };
});
