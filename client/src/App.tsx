import React from "react";
import { Route, Switch } from "wouter";
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
const NotFound = ()=> <div style={{color:"red"}}>404 — Page Not Found</div>;
export default ()=>(
  <Layout>
    <Switch>
      <Route path="/staff-audit/" component={Dashboard}/>
      <Route path="/staff-audit/pipeline" component={Pipeline}/>
      <Route path="/staff-audit/crm" component={CRM}/>
      <Route path="/staff-audit/communication" component={Communication}/>
      <Route path="/staff-audit/reports" component={Reports}/>
      <Route path="/staff-audit/lenders" component={Lenders}/>
      <Route path="/staff-audit/referrals" component={Referrals}/>
      <Route path="/staff-audit/marketing" component={Marketing}/>
      <Route path="/staff-audit/settings" component={Settings}/>
      <Route component={NotFound}/>
    </Switch>
  </Layout>
);
