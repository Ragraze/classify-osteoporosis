import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        // Django checks Origin against Host, so preserve the browser's host.
        changeOrigin: false,
      },
    },
  },
});
