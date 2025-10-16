// === Universal Proxy Config for Boreal Staff App ===
// Redirects frontend calls to backend during dev or Codespaces builds

const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    ["/api", "/uploads", "/auth", "/docs", "/crm", "/ocr", "/banking"],
    createProxyMiddleware({
      target: "https://staff.boreal.financial",
      changeOrigin: true,
      secure: true,
      headers: {
        Connection: "keep-alive",
      },
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader("x-proxy-source", "codespaces");
      },
    })
  );
};
