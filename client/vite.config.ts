import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  root: "./",
  base: "/staff-audit/",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
  },
});
