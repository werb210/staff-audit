// TopTabsDashboard disabled - using AppShell sidebar navigation only
import React from "react";
import { AppShell } from "../ui/AppShell";

export default function Dashboard(){ 
  return (
    <AppShell active="dashboard">
      <h1>Dashboard</h1>
      <p>Dashboard content using sidebar navigation only.</p>
    </AppShell>
  );
}
