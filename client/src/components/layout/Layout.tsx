import React from "react";
import { Link } from "wouter";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
    <nav style={{ width: 220, background: "#0f172a", color: "#f8fafc", padding: "1rem" }}>
      <h2 style={{ color: "#38bdf8" }}>Boreal Staff</h2>
      <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Link href="/staff-audit/"><span>Dashboard</span></Link>
        <Link href="/staff-audit/crm"><span>CRM</span></Link>
        <Link href="/staff-audit/documents"><span>Documents</span></Link>
        <Link href="/staff-audit/communication"><span>Communication</span></Link>
        <Link href="/staff-audit/reports"><span>Reports</span></Link>
        <Link href="/staff-audit/settings"><span>Settings</span></Link>
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
