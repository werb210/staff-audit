import { useEffect } from "react";

export default function RouteDebug() {
  // Note: useMatches is only available in data routers (createBrowserRouter), not BrowserRouter
  useEffect(() => {
    console.info("[Route]", window.location.pathname);
  }, []);
  return null;
}
