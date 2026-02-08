import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@convex": path.resolve(__dirname, "../convex"),
    },
  },
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:5001", changeOrigin: true },
      "/files": { target: "http://127.0.0.1:5001", changeOrigin: true },
    },
  },
})
