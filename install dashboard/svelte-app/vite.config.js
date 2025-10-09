import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  server: {
    host: true,
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:5174",
        changeOrigin: true,
      },
    },
  },
});