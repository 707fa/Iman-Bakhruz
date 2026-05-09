import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5188,
    strictPort: true,
    open: "/login",
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
