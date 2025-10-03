// Pure router shim - NO app imports allowed
// Only re-exports from react-router-dom and wouter
import React, { useEffect, useMemo } from "react";
import {
  Router as WouterRouter,
  Link as WLink,
  Route as WRoute,
  Switch as WSwitch,
  useLocation as useWouterLocation,
  useRoute as useWouterRoute,
} from "wouter";

/* ------------------ Base Router (auto-detect Replit iframe) ------------------ */
function getPathSafe() {
  try { return (window?.location?.pathname ?? "") as string; } catch { return ""; }
}

function getPathnameFromWindow() {
  try { return window?.location?.pathname || ""; } catch { return ""; }
}

function getSearchFromWindow() {
  try { return window?.location?.search || ""; } catch { return ""; }
}

function getHashFromWindow() {
  try { return window?.location?.hash || ""; } catch { return ""; }
}

function BaseRouter({ children }: { children: React.ReactNode }) {
  const path = getPathSafe();
  const base = path.startsWith("/.replit.dev") ? "/.replit.dev" : "";
  return <WouterRouter base={base}>{children}</WouterRouter>;
}

export const BrowserRouter = BaseRouter;
export const HashRouter = BaseRouter;
export const Router = BaseRouter;

/* ----------------------------- useNavigate() -------------------------------- */
export function useNavigate() {
  const [, nav] = useWouterLocation();
  return (to: string, opts?: { replace?: boolean }) => nav(to, opts as any);
}

/* -------------------------------- Navigate --------------------------------- */
export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  useEffect(() => { navigate(to, { replace }); }, [to, replace]);
  return null;
}

/* -------------------------------- useLocation ------------------------------- */
export function useLocationRRD() {
  const pathname = getPathnameFromWindow();
  const search = getSearchFromWindow();
  const hash = getHashFromWindow();
  
  return useMemo(
    () => ({
      pathname,
      search,
      hash,
      state: null,
      key: "shim",
    }),
    [pathname, search, hash]
  );
}

export const useLocation = useWouterLocation;

/* -------------------------- Params plumbing (v6) ---------------------------- */
const ParamsCtx = React.createContext<Record<string, string>>({});
export function useParams<T extends Record<string, string>>() {
  return React.useContext(ParamsCtx) as T;
}

/* ---------------------------- Search params (v6) ---------------------------- */
export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | string | Record<string, string>) => void
] {
  const [, nav] = useWouterLocation();
  const [sp, setSp] = React.useState(() => new URLSearchParams(getSearchFromWindow()));
  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(getSearchFromWindow()));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const set = (next: URLSearchParams | string | Record<string, string>) => {
    const ns =
      next instanceof URLSearchParams
        ? next
        : typeof next === "string"
        ? new URLSearchParams(next)
        : new URLSearchParams(Object.entries(next));
    const url = getPathnameFromWindow() + (ns.toString() ? `?${ns}` : "");
    nav(url, { replace: true } as any);
    setSp(ns);
  };
  return [sp, set];
}

export function createSearchParams(obj: Record<string, string>) {
  return new URLSearchParams(Object.entries(obj));
}

/* -------------------------- Link / NavLink / Outlet ------------------------- */
export const Link = (props: any) => <WLink href={props.to ?? props.href} {...props} />;

export function NavLink({
  to,
  className,
  activeClassName = "active",
  ...rest
}: any) {
  const [isActive] = useWouterRoute(to);
  const cls =
    typeof className === "function"
      ? className({ isActive })
      : [className, isActive ? activeClassName : null].filter(Boolean).join(" ");
  return <WLink href={to} className={cls} aria-current={isActive ? "page" : undefined} {...rest} />;
}

export const Outlet = () => null;

/* ------------------------------ Routes / Route ------------------------------ */
export const Routes = WSwitch;
export const Switch = WSwitch;

export function Route({
  path,
  element,
  component,
  children,
}: {
  path: string;
  element?: React.ReactNode;
  component?: React.ComponentType<any>;
  children?: any;
}) {
  return (
    <WRoute path={path}>
      {(params: Record<string, string>) => (
        <ParamsCtx.Provider value={params}>
          {element
            ? element
            : component
            ? React.createElement(component, { params })
            : typeof children === "function"
            ? children(params)
            : children}
        </ParamsCtx.Provider>
      )}
    </WRoute>
  );
}