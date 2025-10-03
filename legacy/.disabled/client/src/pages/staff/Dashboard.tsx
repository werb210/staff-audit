import React from "react";
// TopTabsDashboard disabled - using AppShell sidebar navigation only
import { AppShell } from "../../ui/AppShell";

export default function Dashboard(){
  return (
    <AppShell active="pipeline">
      <h1>Sales Pipeline</h1>
      <p>Sales Pipeline content - dashboard functionality removed per canonical 9-tab navigation.</p>
    </AppShell>
  );
}