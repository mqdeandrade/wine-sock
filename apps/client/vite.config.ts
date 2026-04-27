import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiTarget = process.env.VITE_DEV_API_TARGET ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": apiTarget,
      "/socket.io": {
        target: apiTarget,
        ws: true,
      },
    },
  },
});
