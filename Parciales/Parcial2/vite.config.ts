import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_PUBLIC_", "NEXT_PUBLIC_"],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:4000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_, __, res) => {
            if (!res || !("writeHead" in res) || !("headersSent" in res) || res.headersSent) {
              return;
            }
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "No se pudo conectar con el servicio de checkout.",
              }),
            );
          });
        },
      },
    },
  },
});
