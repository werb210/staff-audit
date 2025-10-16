import Dashboard from '../pages/Dashboard';
import Pipeline from '../pages/Pipeline';
import Contacts from '../pages/Contacts';
import ApplicationsPlus from '../pages/ApplicationsPlus';
import CommunicationCenter from '../pages/CommunicationCenter';
import LenderOperations from '../pages/LenderOperations';
import AnalyticsHub from '../pages/AnalyticsHub';
import SystemManagement from '../pages/SystemManagement';
import NotFoundRoute from './NotFoundRoute';
import { getTabSafe } from '../lib/query';

// Simple placeholder components for features not yet implemented
function Reports() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <p>Reports content coming soon</p>
    </div>
  );
}

function Calendar() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Calendar</h1>
      <p>Calendar content coming soon</p>
    </div>
  );
}

function Marketing() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Marketing</h1>
      <p>Marketing content coming soon</p>
    </div>
  );
}

export default function PortalRoute() {
  const tab = getTabSafe();
  // normalize legacy labels
  const normalized =
    ({
      dashboard: "dashboard",
      pipeline: "pipeline",
      contacts: "contacts",
      appsplus: "appsplus",
      applications: "appsplus",
      communications: "comm",
      comm: "comm",
      lender: "lenders",
      lenders: "lenders",
      analytics: "analytics",
      system: "sys",
      sys: "sys",
      reports: "reports",
      tasks: "tasks",
      calendar: "calendar",
      marketing: "marketing",
      settings: "settings",
    } as Record<string, string>)[tab] || "dashboard";

  switch (normalized) {
    case "dashboard":  return <Dashboard />;
    case "pipeline":   return <Pipeline />;
    case "contacts":   return <Contacts />;
    case "appsplus":   return <ApplicationsPlus />;
    case "comm":       return <CommunicationCenter />;
    case "lenders":    return <LenderOperations />;
    case "analytics":  return <AnalyticsHub />;
    case "sys":        return <SystemManagement />;
    case "reports":    return <Reports />;
    case "tasks":      return <Reports />;
    case "calendar":   return <Calendar />;
    case "marketing":  return <Marketing />;
    case "settings":   return <SystemManagement />;
    // if someone breaks the contract hard, don't crash the shell
    default:           return <NotFoundRoute />;
  }
}