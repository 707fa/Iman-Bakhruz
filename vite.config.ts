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
        target: "https://result-backend-ynme.onrender.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
