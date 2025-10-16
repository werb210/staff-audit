import React from "react";
import { Route, Switch } from "wouter";
import { Layout } from "./components/Layout";
import { Dashboard, CRM, Documents, Communication, Reports, Settings } from "./pages";

const NotFound = () => (
  <div style={{ padding: "2rem", color: "red" }}>
    <h3>404 — Page Not Found</h3>
  </div>
);

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/staff-audit/" component={Dashboard} />
        <Route path="/staff-audit/crm" component={CRM} />
        <Route path="/staff-audit/documents" component={Documents} />
        <Route path="/staff-audit/communication" component={Communication} />
        <Route path="/staff-audit/reports" component={Reports} />
        <Route path="/staff-audit/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}
