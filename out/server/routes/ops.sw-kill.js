import { Router } from "express";
const r = Router();
// Any request for a service worker gets a self-destructing no-op
r.get(["/service-worker.js", "/sw.js", "/sw-*"], (_req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    // Immediately unregister any existing SW in this scope
    res.end(`
    self.addEventListener('install', e => self.skipWaiting());
    self.addEventListener('activate', e => {
      self.registration.unregister().then(() => {
        return self.clients.matchAll({ includeUncontrolled:true })
      }).then(list => { list.forEach(c => c.navigate(c.url)); });
    });
  `);
});
export default r;
