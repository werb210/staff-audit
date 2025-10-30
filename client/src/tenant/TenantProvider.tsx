import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Tenant = "bf" | "slf";
const TenantCtx = createContext<Tenant>("bf");

function getTenantFromPath(pathname: string): Tenant {
  return pathname.startsWith("/staff/slf") ? "slf" : "bf";
}

/**
 * Router-agnostic provider:
 * - Does NOT call useLocation() (prevents "reading 'location'" crash)
 * - Tracks URL changes via popstate + pushState/replaceState monkey-patch
 */
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tenant, setTenant] = useState<Tenant>(() =>
    typeof window !== "undefined"
      ? getTenantFromPath(window.location.pathname)
      : "bf",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const notify = () => setTenant(getTenantFromPath(window.location.pathname));

    // Track back/forward
    window.addEventListener("popstate", notify);

    // Track in-app navigation (pushState/replaceState)
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args: any[]) {
      const r = origPush.apply(this, args as any);
      notify();
      return r;
    };
    history.replaceState = function (...args: any[]) {
      const r = origReplace.apply(this, args as any);
      notify();
      return r;
    };

    return () => {
      window.removeEventListener("popstate", notify);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  const value = useMemo(() => tenant, [tenant]);
  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
};

export const useTenant = () => useContext(TenantCtx);
