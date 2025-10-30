import { useEffect, useRef } from "react";
import { trackPageView } from "../lib/analytics";

export const useAnalytics = () => {
  const prevLocationRef = useRef<string>("");

  useEffect(() => {
    // Use window.location.pathname instead of wouter's useLocation
    // to avoid router context dependency during app initialization
    const currentLocation = window.location.pathname;

    if (currentLocation !== prevLocationRef.current) {
      trackPageView(currentLocation);
      prevLocationRef.current = currentLocation;
    }

    // Listen for navigation changes
    const handleLocationChange = () => {
      const newLocation = window.location.pathname;
      if (newLocation !== prevLocationRef.current) {
        trackPageView(newLocation);
        prevLocationRef.current = newLocation;
      }
    };

    // Listen for both popstate and pushstate/replacestate events
    window.addEventListener("popstate", handleLocationChange);

    // Cleanup
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);
};
