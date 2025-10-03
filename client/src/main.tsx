import '@/lib/fetchAuthInterceptor';   // must be first so it wraps fetch before anything makes requests

import React from "react";
import ReactDOM from "react-dom/client";
// Removed dev dialer hotkey for production
import App from "./App";
import "./index.css";
import { setupPWA } from "./lib/pwa";
// import BuildRibbon from "./components/debug/BuildRibbon"; // Removed to eliminate debug overlays
import log from "@/lib/log";
import { Providers } from "@/app/Providers";

// Disabled dev tools to remove debug overlays
// if (import.meta.env.DEV) {
//   import('./devtools').catch(() => {});
// }

// Dev guard to catch foreign-origin fetches (always active for security)
if (import.meta.env.DEV) {
  const _fetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as URL).toString();
    if (/^https?:\/\//i.test(url) && !url.startsWith(location.origin)) {
      console.warn('[DEV] Foreign-origin fetch detected; forcing same-origin is required:', url);
    }
    return _fetch(input, init);
  };
}

// Shallow UI notifier — swap for your toast if you have one
function toast(msg: string) {
  if (!import.meta.env.DEV) return; // keep dev-only for now
  // minimal: show a tiny overlay; or wire your real toast here
  console.warn("[ui]", msg);
}

window.addEventListener("error", (e) => {
  // Avoid duplicating noisy network errors
  const msg = String(e.message || "");
  if (/ERR_BLOCKED_BY_CLIENT|net::ERR|NetworkError|injected|eruda|sock/i.test(msg)) return;
  toast("Unexpected error. Check recent action.");
  log.error("window.error:", e.error ?? msg);
});

window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
  const msg = String((e.reason && e.reason.message) || e.reason || "");
  if (/Failed to fetch|NetworkError|injected|eruda|sock/i.test(msg)) return; // don't spam
  toast("Something went wrong. Please retry.");
  log.error("unhandledrejection:", e.reason);
});


// Try to disable common injected consoles if present
try {
  // Eruda cleanup (mobile console injectors)
  const w: any = window as any;
  if (w.eruda && typeof w.eruda.destroy === "function") {
    w.eruda.destroy();
  }
  // Guard against scripts that poll same-origin without creds
  (w as any).__INJECT_BLOCK__ = true;
} catch {}

setupPWA();

// 🚨 CRITICAL: Simplified React mounting with better error catching
console.log("🎯 [REACT] Starting React application mount process...");

const root = document.getElementById("root");
console.log("📄 [REACT] Root element found:", !!root, root);

if (!root) {
  console.error("❌ [REACT] CRITICAL: Root element (#root) not found in DOM!");
  document.body.innerHTML = '<div style="padding:20px;color:red;border:2px solid red;background:#ffe6e6;"><h2>🚨 React Mount Failed</h2><p>Root element (#root) not found in DOM</p></div>';
} else {
  try {
    console.log("✅ [REACT] Root element found, creating React root...");
    
    const reactRoot = ReactDOM.createRoot(root);
    
    console.log("🚀 [REACT] Rendering full application...");
    reactRoot.render(
      <Providers>
        <App />
      </Providers>
    );
    
    console.log("✅ [REACT] Full app render completed!");
    
  } catch (error) {
    console.error("🚨 [REACT] CRITICAL ERROR during React mount:", error);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding:20px;color:red;border:2px solid red;background:#ffe6e6;margin:20px;';
    errorDiv.innerHTML = `<h2>🚨 React Mount Error</h2><p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p><pre>${error instanceof Error ? error.stack : 'No stack trace'}</pre>`;
    document.body.appendChild(errorDiv);
  }
}