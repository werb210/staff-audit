import { useLocation, Link } from "wouter";

// Simple navigation hook to avoid shim dependency
const useNavigate = () => {
  const [, setLocation] = useLocation();
  return (to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) {
      window.history.replaceState({}, "", to);
    } else {
      window.history.pushState({}, "", to);
    }
    setLocation(to);
  };
};
import { Switch, Route } from "wouter";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { NAV_BF, NAV_SLF } from "./nav";
import SiloRouteGuard from "./SiloRouteGuard";
import SiloSwitcher from "../components/layout/SiloSwitcher";
import SimpleAIActionBar from "../components/ai/SimpleAIActionBar";
// Removed old SlideInDialer - using new single Dialer implementation
import { DialerFab } from "../dialer/Fab";
import ErrorBoundary from "./ErrorBoundary";
import PageErrorBoundary from "../components/PageErrorBoundary";
import { lower } from "@/lib/dedupe";

// Dynamic navigation based on active silo
function getNavForSilo(siloType: string) {
  return siloType === "slf" ? NAV_SLF : NAV_BF;
}

// Get brand name based on silo
function getBrandForSilo(siloType: string) {
  return siloType === "slf" ? "Site Level Financial" : "Boreal Financial";
}

// CRITICAL FIX: Use lazy loading to break circular imports and prevent TDZ errors

const DashboardPage = lazy(
  () => import("@/pages/staff/dashboard/DashboardPage"),
);
const PipelineLazy = lazy(() => import("@/pages/staff/pipeline/PipelineRoute"));
const ContactsPage = lazy(() => import("@/pages/staff/contacts/ContactsPage"));
const CommunicationsPage = lazy(
  () => import("@/pages/staff/communications/CommunicationPage"),
);
const TasksCalendarPage = lazy(() =>
  import("@/pages/staff/tasks/TasksCalendarPage").then((m) => ({
    default: m.TasksCalendarPage,
  })),
);
const ReportsPageComponent = lazy(
  () => import("@/pages/staff/reports/ReportsPage"),
);
const MarketingPageComponent = lazy(
  () => import("@/pages/staff/marketing/MarketingPage"),
);
const LendersPage = lazy(() =>
  import("@/pages/staff/lenders/LendersPage").then((m) => ({
    default: m.LendersPage,
  })),
);
const LenderProductsV1Page = lazy(
  () => import("@/pages/staff/lenders/LenderProductsV1Page"),
);
const SettingsPageComponent = lazy(
  () => import("@/pages/staff/settings/SettingsPage"),
);
const UserManagementPage = lazy(
  () => import("@/pages/staff/settings/UserManagementPage"),
);
const TwilioSettingsPage = lazy(
  () => import("@/pages/staff/settings/TwilioSettingsPage"),
);
const LendersSettingsPage = lazy(
  () => import("@/pages/staff/settings/LendersSettingsPage"),
);
const DocumentsSettingsPage = lazy(
  () => import("@/pages/staff/settings/DocumentsSettingsPage"),
);
const SecuritySettingsPage = lazy(
  () => import("@/pages/staff/settings/SecuritySettingsPage"),
);
const FeatureInspector = lazy(() => import("@/routes/FeatureInspector"));

// Inner shell component that uses silo context
function InnerShell() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("nav-collapsed") === "1",
  );

  const [q, setQ] = useState("");
  const pathname = window.location.pathname;

  // CRITICAL FIX: Detect silo directly from URL path instead of unreliable API
  const actualSilo = pathname.startsWith("/staff/slf/") ? "slf" : "bf";

  // Dialer functionality now handled by zustand store
  const nav = useMemo(() => getNavForSilo(actualSilo), [actualSilo]);
  const brandName = useMemo(() => getBrandForSilo(actualSilo), [actualSilo]);

  // Add effect to update body data attribute for CSS theming
  useEffect(() => {
    document.body.setAttribute("data-silo", actualSilo);
    return () => document.body.removeAttribute("data-silo");
  }, [actualSilo]);
  const navigate = useNavigate();

  // remember collapse state
  useEffect(() => {
    localStorage.setItem("nav-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // derive page title from current route
  const title =
    nav.find(
      (n) =>
        pathname === n.to || (n.to !== "/staff" && pathname.startsWith(n.to)),
    )?.label ?? "Staff";

  // quick keyboard shortcuts (g p -> pipeline, g c -> contacts)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (lower(e.key) === "g") {
        let next = "";
        const on2 = (e2: KeyboardEvent) => {
          next = lower(e2.key);
          if (next === "p") navigate("/staff/pipeline");
          if (next === "c") navigate("/staff/contacts");
          if (next === "d") navigate("/staff");
          window.removeEventListener("keydown", on2);
        };
        window.addEventListener("keydown", on2, { once: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // simple global "jump": send query to current page via URL ?q=
    const pathname = window.location.pathname || "";
    const base = pathname.startsWith("/staff")
      ? pathname || "/staff"
      : "/staff";
    const url = new URL(base, location.origin);
    if (q) url.searchParams.set("q", q);
    navigate(url.pathname + url.search);
  };

  return (
    <div className="min-h-screen bg-[#f7f8fb]" data-testid="side-nav">
      {/* Simple AI Action Bar - working version */}
      <SimpleAIActionBar
        ctx={{
          entityType: "application",
          entityId: undefined,
          name: undefined,
          amount: undefined,
        }}
      />

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${collapsed ? "w-14" : "w-[240px]"} transition-all shrink-0 bg-white border-r`}
        >
          <div className="flex items-center justify-between px-3 py-3 border-b">
            <button
              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="Toggle navigation"
              title="Toggle navigation"
            >
              {collapsed ? "»" : "«"}
            </button>
            {!collapsed && (
              <div className="text-sm font-semibold">{brandName}</div>
            )}
            {collapsed && (
              <div className="text-xs font-semibold text-center">
                {actualSilo.toUpperCase()}
              </div>
            )}
            <div />
          </div>
          <nav className="flex flex-col gap-1 px-2 pb-4 pt-2">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={(isActive: boolean) =>
                  `rounded px-3 py-2 text-sm overflow-hidden text-ellipsis ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "hover:bg-gray-100"
                  } ${collapsed ? "text-center px-0" : ""}`
                }
                title={collapsed ? item.label : undefined}
              >
                {collapsed ? item.label[0] : item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Silo Switcher - integrated into sidebar */}

          {/* Top bar */}
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
            <div className="h-12 flex items-center gap-3 px-4">
              <div className="font-semibold">{title}</div>

              <div className="ml-auto flex items-center gap-2">
                <form onSubmit={onSearch} className="flex items-center gap-2">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search… (g p = Pipeline)"
                    className="w-[260px] max-w-[50vw] border rounded px-2 py-1 text-sm"
                  />
                  <button className="text-sm px-3 py-1 rounded bg-gray-900 text-white hover:opacity-90">
                    Search
                  </button>
                </form>

                {/* Removed duplicate dialer button - using global portal FAB instead */}

                <SiloSwitcher />
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4">
            <SiloRouteGuard />
            <Switch>
              {/* specific pages FIRST - wrapped in Suspense to prevent TDZ errors */}
              <Route
                path="/staff/dashboard"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <DashboardPage />
                  </Suspense>
                )}
              />
              <Route
                path="/staff/pipeline"
                component={() => (
                  <ErrorBoundary>
                    <Suspense fallback={null}>
                      <PipelineLazy />
                    </Suspense>
                  </ErrorBoundary>
                )}
              />
              <Route
                path="/staff/contacts"
                component={() => (
                  <PageErrorBoundary>
                    <Suspense fallback={<div>Loading...</div>}>
                      <ContactsPage />
                    </Suspense>
                  </PageErrorBoundary>
                )}
              />
              <Route
                path="/staff/communication"
                component={() => (
                  <PageErrorBoundary>
                    <Suspense fallback={<div>Loading...</div>}>
                      <CommunicationsPage />
                    </Suspense>
                  </PageErrorBoundary>
                )}
              />
              <Route
                path="/staff/tasks-calendar"
                component={() => (
                  <PageErrorBoundary>
                    <Suspense fallback={<div>Loading...</div>}>
                      <TasksCalendarPage />
                    </Suspense>
                  </PageErrorBoundary>
                )}
              />
              <Route
                path="/staff/reports"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <ReportsPageComponent />
                  </Suspense>
                )}
              />
              <Route
                path="/staff/marketing"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <MarketingPageComponent />
                  </Suspense>
                )}
              />
              <Route
                path="/staff/lenders/v1"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <LenderProductsV1Page />
                  </Suspense>
                )}
              />
              <Route
                path="/staff/lenders"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <LendersPage />
                  </Suspense>
                )}
              />
              <Route
                path="/staff/settings/user-management"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <UserManagementPage />
                  </Suspense>
                )}
              />
              <Route
                path="/staff/settings/twilio"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <TwilioSettingsPage />
                  </Suspense>
                )}
              />
              <Route
                path="/staff/settings/lenders"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <LendersSettingsPage />
                  </Suspense>
                )}
              />
              <Route
                path="/staff/settings/documents"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <DocumentsSettingsPage />
                  </Suspense>
                )}
              />
              <Route
                path="/staff/settings/security"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <SecuritySettingsPage />
                  </Suspense>
                )}
              />
              <Route
                path="/staff/settings"
                component={() => (
                  <PageErrorBoundary>
                    <Suspense fallback={<div>Loading...</div>}>
                      <SettingsPageComponent />
                    </Suspense>
                  </PageErrorBoundary>
                )}
              />
              <Route
                path="/staff/dev/features"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <FeatureInspector />
                  </Suspense>
                )}
              />
              {/* fallback LAST */}
              <Route
                path="/staff/:rest*"
                component={() => (
                  <Suspense fallback={<div>Loading...</div>}>
                    <DashboardPage />
                  </Suspense>
                )}
              />
            </Switch>
          </main>
        </div>

        {/* All debugging components removed */}
        {/* <ToastHost /> */}

        {/* Version banner for build verification */}
        <div className="fixed bottom-1 left-1 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
          v{new Date().toISOString().slice(0, 16).replace("T", " ")}
        </div>

        {/* Dialer components - single authoritative mount */}
        <DialerFab />
      </div>
    </div>
  );
}

// Export the shell - providers handled by ShellGuard
export default function Shell() {
  return <InnerShell />;
}
