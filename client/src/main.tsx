import React from "react";
import ReactDOM from "react-dom/client";
import { Router, Route } from "wouter";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import CRM from "./pages/CRM";
import Communication from "./pages/Communication";
import Reports from "./pages/Reports";
import Lenders from "./pages/Lenders";
import Referrals from "./pages/Referrals";
import Marketing from "./pages/Marketing";
import Settings from "./pages/Settings";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Use hash-based routing for GitHub Pages */}
    <Router base="/staff-audit" hook={null}>
      <Layout>
        <Route path="/" component={Dashboard} />
        <Route path="/pipeline" component={Pipeline} />
        <Route path="/crm" component={CRM} />
        <Route path="/communication" component={Communication} />
        <Route path="/reports" component={Reports} />
        <Route path="/lenders" component={Lenders} />
        <Route path="/referrals" component={Referrals} />
        <Route path="/marketing" component={Marketing} />
        <Route path="/settings" component={Settings} />
      </Layout>
    </Router>
  </React.StrictMode>
);
