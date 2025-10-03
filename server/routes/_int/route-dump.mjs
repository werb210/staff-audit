import { Router } from "express";

const r = Router();

r.get("/api/_int/routes", (req, res) => {
  const out = [];
  req.app._router.stack.forEach((s) => {
    if (s.route && s.route.path) {
      const methods = Object.keys(s.route.methods).filter(Boolean);
      out.push({ path: s.route.path, methods });
    }
    if (s.name === "router" && s.handle?.stack) {
      s.handle.stack.forEach((h) => {
        if (h.route?.path) {
          const methods = Object.keys(h.route.methods).filter(Boolean);
          out.push({ path: h.route.path, methods });
        }
      });
    }
  });
  res.json({ routes: out });
});

export default r;