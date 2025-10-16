import { useEffect, useState } from "react";
import AppShell from "./AppShell";
import Dashboard from "../pages/Dashboard";
import Pipeline from "../pages/Pipeline";
import LenderOperations from "../pages/LenderOperations";
import CalendarTasks from "../pages/CalendarTasks";
import CommunicationCenter from "../pages/CommunicationCenter";
import SystemManagement from "../pages/SystemManagement";

type User = { id: string; email: string; name?: string } | null;

export default function DirectPortal() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("dashboard");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try bearer token first (iframe-safe)
        const bearer = sessionStorage.getItem("devBearer");
        if (bearer) {
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${bearer}` }
          });
          if (response.ok) {
            const userData = await response.json();
            if (userData.id && userData.email) {
              setUser(userData);
              setLoading(false);
              return;
            }
          }
        }

        // Fallback to cookie auth
        const response = await fetch('/api/auth/user', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            setLoading(false);
            return;
          }
        }

        // No authentication found, redirect to login
        window.location.assign(`${window.location.origin}/#/login`);
      } catch (error) {
        console.error("Auth check failed:", error);
        window.location.assign(`${window.location.origin}/#/login`);
      }
    };

    checkAuth();

    // Listen for hash changes to update current page
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#/portal/")) {
        const page = hash.replace("#/portal/", "").split("/")[0] || "dashboard";
        setCurrentPage(page);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--ui-bg)',
        color: 'var(--ui-text)'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const renderPage = () => {
    switch (currentPage) {
      case "pipeline": return <Pipeline />;
      case "lenders": return <LenderOperations />;
      case "calendar-tasks": return <CalendarTasks />;
      case "communication": return <CommunicationCenter />;
      case "settings": return <SystemManagement />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppShell>
      {renderPage()}
    </AppShell>
  );
}