// 🔒 CANONICAL PWA MANAGEMENT - DO NOT DUPLICATE
// PWA and service worker management
export function setupPWA() {
    // Unregister stale service workers in dev - single console message
    const isProd = import.meta.env?.MODE === "production";
    if (!isProd && "serviceWorker" in navigator) {
        navigator.serviceWorker
            .getRegistrations()
            .then((regs) => {
            if (regs.length > 0) {
                console.info("[SW] Disabled in development to prevent stale cache");
                regs.forEach((r) => r.unregister());
            }
        })
            .catch(() => { });
    }
    // PWA install banner management - stores the beforeinstallprompt event
    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Don't show install banner automatically in development
        if (isProd) {
            // You can show install UI here if needed
            console.log("[PWA] Install prompt available", deferredPrompt);
        }
    });
}
// Legacy alias for compatibility
export const registerSW = setupPWA;
