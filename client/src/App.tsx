import React from "react";
import { Route, Switch } from "wouter";

function Home() {
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>Boreal Financial — Staff Portal</h2>
      <p>Dashboard is active and routing is functional.</p>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ padding: "2rem", color: "red", fontFamily: "sans-serif" }}>
      <h3>404 — Page Not Found</h3>
    </div>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/staff-audit/" component={Home} />
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}
