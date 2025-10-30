// Canonical Wouter-only router shim
import {
  Router as WouterRouter,
  Route,
  Link,
  useLocation,
  useRoute,
} from "wouter";

export const Router = WouterRouter;
export const RouteShim = Route;
export const LinkShim = Link;
export const useLocationShim = useLocation;
export const useRouteShim = useRoute;

// Dummy export for compatibility — ensures BrowserRouter is not undefined
export const BrowserRouter = () => {
  throw new Error("BrowserRouter is banned. Use Wouter Router instead.");
};
