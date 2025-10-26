import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // loads .env.production or .env.development

  return {
    root: "./",
    base: "/staff-audit/",
    plugins: [react()],
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL),
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
  };
});
