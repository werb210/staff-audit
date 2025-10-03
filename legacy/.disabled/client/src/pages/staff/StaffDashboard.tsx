import React from "react";
import { isAllowedTab, getVisibleTabs } from "../../lib/rbac";
import { http } from "../../lib/http";
import SalesPipeline from "./sections/SalesPipeline";
import ContactsHubspot from "./ContactsHubspot";
import CommunicationCenter from "./sections/CommunicationCenter";
import EnhancedMarketingHub from "./sections/marketing/EnhancedMarketingHub";
import LendersDirectory from "./LendersDirectory";
import Settings from "./sections/settings/Settings";
import ROISummaryPage from "../Analytics/ROISummaryPage";
import TasksPage from "../Productivity/TasksPage";
import SchedulingSettingsPage from "../Productivity/SchedulingSettingsPage";
import LenderPortalPage from "../Lenders/LenderPortalPage";

// CANONICAL 9-TAB NAVIGATION (no dashboard/analytics/productivity)
type TabKey = "pipeline" | "lenders" | "lenderProducts" | "contacts" | "comms" | "reports" | "tasksCalendar" | "marketing" | "settings";

function DashboardOverview() {
  const [stats, setStats] = React.useState<any>({});
  const [recentApps, setRecentApps] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      http("/pipeline"),
      http("/applications")
    ]).then(([pipelineData, appsData]) => {
      const counts = pipelineData.counts || {};
      const totalApps = Object.values(counts).reduce((a: any, b: any) => a + b, 0);
      setStats({
        totalApplications: totalApps,
        newApplications: counts.new || 0,
        inReview: counts["in review"] || counts.in_review || 0,
        funded: counts.funded || 0
      });
      setRecentApps((appsData.items || []).slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="lm-title">Dashboard Overview</div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="lm-card">
          <h3 className="text-sm font-medium text-gray-500">Total Applications</h3>
          <div className="text-2xl font-bold text-blue-600">{stats.totalApplications || 0}</div>
          <div className="text-xs text-gray-400">Active in pipeline</div>
        </div>
        <div className="lm-card">
          <h3 className="text-sm font-medium text-gray-500">New Applications</h3>
          <div className="text-2xl font-bold text-green-600">{stats.newApplications}</div>
          <div className="text-xs text-gray-400">Needs initial review</div>
        </div>
        <div className="lm-card">
          <h3 className="text-sm font-medium text-gray-500">In Review</h3>
          <div className="text-2xl font-bold text-yellow-600">{stats.inReview}</div>
          <div className="text-xs text-gray-400">Pending decisions</div>
        </div>
        <div className="lm-card">
          <h3 className="text-sm font-medium text-gray-500">Funded</h3>
          <div className="text-2xl font-bold text-purple-600">{stats.funded}</div>
          <div className="text-xs text-gray-400">Successfully closed</div>
        </div>
      </div>

      <div className="lm-card">
        <h3 className="text-lg font-semibold mb-4">Recent Applications</h3>
        {recentApps.length === 0 ? (
          <div className="text-gray-500">No recent applications</div>
        ) : (
          <div className="space-y-2">
            {recentApps.map((app: any) => (
              <div key={app.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{app.business_name || "Unnamed Business"}</div>
                  <div className="text-sm text-gray-500">
                    {app.loan_amount ? `$${parseInt(app.loan_amount).toLocaleString()}` : "Amount TBD"} • 
                    Status: {app.status || "New"}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {app.created_at ? new Date(app.created_at).toLocaleDateString() : "Recent"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const [tab, setTab] = React.useState<TabKey>("pipeline");
  const visibleTabs = getVisibleTabs();

  return (
    <div className="lm-container">
      <div className="lm-card">
        <div className="lm-toolbar">
          <div className="lm-title">Boreal Financial Staff Portal</div>
          <nav className="lm-nav">
            {visibleTabs.map(t => (
              <button
                key={t.key}
                className={`lm-pill ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key as TabKey)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="lm-content">
          {/* CANONICAL 9-TAB CONTENT (no dashboard/analytics/productivity) */}
          {tab === "pipeline" && <SalesPipeline />}
          {tab === "lenders" && <LendersDirectory />}
          {tab === "lenderProducts" && <div className="p-4">Lender Products feature coming soon...</div>}
          {tab === "contacts" && <ContactsHubspot />}
          {tab === "comms" && <CommunicationCenter />}
          {tab === "reports" && <ROISummaryPage />}
          {tab === "tasksCalendar" && (
            <div className="space-y-4">
              <TasksPage />
              <SchedulingSettingsPage />
            </div>
          )}
          {tab === "marketing" && <EnhancedMarketingHub />}
          {tab === "settings" && isAllowedTab("settings") && <Settings />}
        </div>
      </div>
    </div>
  );
}