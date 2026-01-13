import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window', // Parche PouchDB
  },
  resolve: {
    alias: {
      // Esta línea es la que resuelve el error @/components
      "@": path.resolve(__dirname, "./src"),
      events: 'events', // Parche PouchDB
    },
  },
})