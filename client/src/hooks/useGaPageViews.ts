import { useEffect } from "react";
import { initGA } from "@/lib/analytics";

export function useGaPageViews() {
  useEffect(() => {
    initGA();
    // Initial page view tracking using window.location
    if (window.gtag && import.meta.env.VITE_GA_MEASUREMENT_ID) {
      window.gtag("config", import.meta.env.VITE_GA_MEASUREMENT_ID, {
        page_path: window.location.pathname + window.location.search,
      });
    }
  }, []);
}
