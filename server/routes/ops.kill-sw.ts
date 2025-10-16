import { Router } from "express";
const r = Router();

// Plain JS that unregisters all SWs and clears caches in the page's origin
r.get("/api/ops/kill-sw.js", (_req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.end(`
(async function() {
  console.log('[SW-KILLER] Starting service worker and cache cleanup...');
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    console.log('[SW-KILLER] Found', regs.length, 'service workers');
    for (const reg of regs) { 
      try { 
        await reg.unregister(); 
        console.log('[SW-KILLER] Unregistered SW:', reg.scope);
      } catch(e){
        console.warn('[SW-KILLER] Failed to unregister SW:', e);
      } 
    }
  }
  if (window.caches && caches.keys) {
    const keys = await caches.keys();
    console.log('[SW-KILLER] Found', keys.length, 'caches');
    for (const k of keys) { 
      try { 
        await caches.delete(k); 
        console.log('[SW-KILLER] Deleted cache:', k);
      } catch(e){
        console.warn('[SW-KILLER] Failed to delete cache:', e);
      } 
    }
  }
  console.log('[SW-KILLER] Cleanup complete, forcing hard reload...');
  // Force a hard reload to pick new bundle
  location.reload(true);
})();`);
});

export default r;