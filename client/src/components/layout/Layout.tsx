import React from "react";
import { Link, useRoute } from "wouter";
const NavItem = ({ href, label }: { href: string; label: string }) => {
  const [active] = useRoute(href);
  return (
    <Link href={href}>
      <div
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          background: active ? "#334155" : "transparent",
          color: active ? "#38bdf8" : "#f8fafc",
          cursor: "pointer",
        }}
      >
        {label}
      </div>
    </Link>
  );
};
export const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{ display: "flex", height: "100vh", fontFamily: "Inter,sans-serif" }}
  >
    <nav
      style={{
        width: 220,
        background: "#0f172a",
        color: "#f8fafc",
        padding: "1rem",
      }}
    >
      <h2 style={{ color: "#38bdf8" }}>Boreal Staff</h2>
      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <NavItem href="/" label="Dashboard" />
        <NavItem href="/pipeline" label="Sales Pipeline" />
        <NavItem href="/crm" label="CRM" />
        <NavItem href="/communication" label="Communication" />
        <NavItem href="/reports" label="Reports" />
        <NavItem href="/lenders" label="Lenders" />
        <NavItem href="/referrals" label="Referrals" />
        <NavItem href="/marketing" label="Marketing" />
        <NavItem href="/settings" label="Settings" />
      </div>
    </nav>
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <header
        style={{
          background: "#1e293b",
          color: "#f1f5f9",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <h1>Boreal Financial — Staff Portal</h1>
        <span>User ▾</span>
      </header>
      <main style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
        {children}
      </main>
    </div>
  </div>
);
