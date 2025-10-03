import React from "react";
import { createBrowserRouter, createHashRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthGate } from "./lib/auth-gate";
import Portal from "./pages/Portal";
import { installServiceWorkerGuard } from "@/boot/swGuard";
import DebugBanner from "./components/DebugBanner";
import "./ui/theme/tokens.css";

function getBase(){
  const meta = document.querySelector('meta[name="app-base"]') as HTMLMetaElement | null;
  const m = meta?.content || "/";
  return m.replace(/\/+$/,"") || "/";
}

const BASENAME = getBase();

const routes = [
  {
    path: "/*",
    element: <Portal />
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
];

let router: any;
try {
  router = createBrowserRouter(routes, { basename: BASENAME });
} catch {
  // Fallback to hash router if browser router fails
  console.warn("[Router] BrowserRouter failed, falling back to HashRouter");
  router = createHashRouter(routes);
}

export default function App(){
  React.useEffect(() => {
    installServiceWorkerGuard();
  }, []);

  return (
    <>
      <DebugBanner />
      <AuthGate />
      <RouterProvider router={router} />
    </>
  );
}
