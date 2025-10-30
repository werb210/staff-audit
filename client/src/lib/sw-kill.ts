// Dev auto-patch: disable SW when VITE_DISABLE_SW=1
if ((import.meta as any).env?.VITE_DISABLE_SW === "1") {
  console.info("SW disabled for dev"); /* early return */
}

export async function killSWInDev() {
  if (import.meta.env.PROD) return;
  try {
    for (const r of await navigator.serviceWorker.getRegistrations())
      await r.unregister();
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    console.info("[DEV] Service worker & caches cleared");
  } catch (e) {
    console.warn("SW kill error", e);
  }
}
