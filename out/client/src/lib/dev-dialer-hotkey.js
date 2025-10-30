/** Dev-only: press env VITE_DIALER_FORCE_OPEN_KEY (default Shift+D) to open slide-in dialer if available. */
import { lower } from "@/lib/dedupe";
const KEY = import.meta.env?.VITE_DIALER_FORCE_OPEN_KEY || "Shift+D";
function matches(e) {
    const want = String(KEY);
    const parts = want.split("+");
    const k = parts.pop() || "";
    const needShift = parts.includes("Shift");
    const ok = lower(e.key) === lower(k) && !!e.shiftKey === needShift;
    return ok;
}
export function installDialerHotkey() {
    if (typeof window === "undefined")
        return;
    window.addEventListener("keydown", (e) => {
        if (matches(e)) {
            // Prefer global hook if app exposes it; else broadcast event
            const anyWin = window;
            if (typeof anyWin.openDialer === "function")
                anyWin.openDialer();
            else
                window.dispatchEvent(new CustomEvent("dialer:open"));
            console.log("[dev] dialer hotkey invoked");
        }
    });
}
