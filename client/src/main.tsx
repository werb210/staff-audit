import React from "react";
import ReactDOM from "react-dom/client";
import { Router, Route } from "wouter";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Documents from "./pages/Documents";
import Communication from "./pages/Communication";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router base="/staff-audit">
      <Layout>
        <Route path="/" component={Dashboard} />
        <Route path="/crm" component={CRM} />
        <Route path="/documents" component={Documents} />
        <Route path="/communication" component={Communication} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
      </Layout>
    </Router>
  </React.StrictMode>
);
