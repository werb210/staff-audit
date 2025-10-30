import { create } from "zustand";
import { queryClient } from "@/lib/queryClient";

export type Silo = "bf" | "slf";

const KEY = "active_silo";

function normalizeRoute(pathname: string, silo: Silo) {
  // map routes into the right "namespace"
  if (silo === "bf") return pathname.replace(/^\/staff\/slf\b/, "/staff");
  // default SLF landing = /staff/slf/status
  if (!/^\/staff\/slf\b/.test(pathname)) {
    return pathname.replace(/^\/staff\b/, "/staff/slf");
  }
  return pathname;
}

type SiloState = {
  silo: Silo;
  setSilo: (s: Silo) => void;
  toggle: () => void;
};

export const useSilo = create<SiloState>((set, get) => ({
  silo: (localStorage.getItem(KEY) as Silo) || "bf",
  setSilo: (s: Silo) => {
    localStorage.setItem(KEY, s);
    set({ silo: s });

    // clear react-query cache so data doesn't "bleed" across silos
    queryClient.clear();

    // normalize current route into the chosen silo's namespace
    const next = normalizeRoute(window.location.pathname, s);
    if (next !== window.location.pathname) {
      window.history.replaceState({}, "", next);
    }

    // let other tabs/components know immediately
    window.dispatchEvent(
      new CustomEvent("silo-change", { detail: { silo: s } }),
    );
  },
  toggle: () => get().setSilo(get().silo === "bf" ? "slf" : "bf"),
}));

// cross-tab sync
window.addEventListener("storage", (e) => {
  if (e.key === KEY && e.newValue) {
    useSilo.getState().setSilo(e.newValue as Silo);
  }
});
