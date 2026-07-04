import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: env.VITE_DEV_SERVER_HOST || undefined,
      port: env.VITE_DEV_SERVER_PORT
        ? Number(env.VITE_DEV_SERVER_PORT)
        : undefined,
    },
  };
});
