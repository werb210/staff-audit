import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSilo } from "../shell/silo";

export default function SiloRouteGuard(): JSX.Element | null {
  const { silo, setSilo } = useSilo();
  // const [, navigate] = useLocation(); // Navigation not currently used

  useEffect(() => {
    const pathname = window.location.pathname;
    const inSLF = /^\/staff\/slf(\b|\/|$)/.test(pathname);

    // Debug info removed for clean interface

    // Update silo state based on URL, don't redirect based on stale state
    if (inSLF && silo !== "slf") {
      setSilo("slf");
    } else if (!inSLF && silo !== "bf") {
      setSilo("bf");
    }

    // No more automatic redirects that interfere with routing
  }, [silo, setSilo]);

  return null;
}
