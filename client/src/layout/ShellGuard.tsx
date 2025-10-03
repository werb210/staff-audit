import React from "react";
import Shell from "../app/Shell";
import { useTenant } from "../tenant/TenantProvider";
import SiloBoundary from "../silo/SiloBoundary";
// Old DialerContext removed - using zustand dialerStore instead

/**
 * Wraps the existing Shell with Router outlet.
 * - Adds a testable marker `data-app-shell="true"`
 * - Forces a fresh mount when silo changes (keyed by tenant)
 * - Wraps with SiloBoundary to reset caches & SSE on switch
 * - Renders Shell without children so it uses its own Outlet
 */
const ShellGuard: React.FC = () => {
  const tenant = useTenant();
  return (
    <div data-app-shell="true">
      <SiloBoundary>
          <Shell key={`shell-${tenant}`} />
      </SiloBoundary>
    </div>
  );
};
export default ShellGuard;