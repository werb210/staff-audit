import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "wouter";
import App from "./App";
import "./index.css";
import { setupPWA } from "./lib/pwa";

setupPWA();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router base="/staff-audit">
      <App />
    </Router>
  </React.StrictMode>
);
