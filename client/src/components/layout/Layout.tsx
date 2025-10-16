import React from "react";
import { Link } from "wouter";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
    <nav style={{ width: 220, background: "#0f172a", color: "#f8fafc", padding: "1rem" }}>
      <h2 style={{ color: "#38bdf8" }}>Boreal Staff</h2>
      <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Link href="/staff-audit/"><a>Dashboard</a></Link>
        <Link href="/staff-audit/crm"><a>CRM</a></Link>
        <Link href="/staff-audit/documents"><a>Documents</a></Link>
        <Link href="/staff-audit/communication"><a>Communication</a></Link>
        <Link href="/staff-audit/reports"><a>Reports</a></Link>
        <Link href="/staff-audit/settings"><a>Settings</a></Link>
      </div>
    </nav>
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <header style={{ background: "#1e293b", color: "#f1f5f9", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between" }}>
        <h1>Boreal Financial — Staff Portal</h1>
        <span>User ▾</span>
      </header>
      <main style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>{children}</main>
    </div>
  </div>
);
