/**
 * Boreal Financial Staff App Proxy Configuration
 * Routes all frontend /api requests to the unified backend.
 */

const target = process.env.VITE_API_BASE || "https://staff.boreal.financial/api";

export default {
  "/api": {
    target,
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/api/, "/api"),
    configure: (proxy) => {
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.setHeader("X-App-Origin", "Boreal-Staff");
        proxyReq.setHeader("X-Forwarded-Host", "staff.boreal.financial");
      });
    },
  },
};
