import { promises as fs } from "fs";
import path from "path";

const featureStatuses = [
  {
    area: "Settings Management System",
    status: "✅",
    notes: "Completed per master status report (feature flags, integrations, admin tools).",
  },
  {
    area: "RBAC System",
    status: "✅",
    notes: "Multi-role access model marked 100% complete.",
  },
  {
    area: "Lenders Management",
    status: "✅",
    notes: "Full lender/product CRUD delivered and production ready.",
  },
  {
    area: "Authentication & Access",
    status: "❌",
    notes: "Twilio Verify integration and admin seed remain unfinished.",
  },
  {
    area: "Contacts (3-pane) CRM",
    status: "❌",
    notes: "Activity timeline and Office 365 quick actions outstanding.",
  },
  {
    area: "Communication Hub",
    status: "❌",
    notes: "Call log UI and dialer features incomplete.",
  },
  {
    area: "Sales Pipeline",
    status: "❌",
    notes: "Drag-and-drop workflow and automation still pending.",
  },
  {
    area: "Documents Platform",
    status: "❌",
    notes: "Version history, OCR processing, and ZIP export gaps remain.",
  },
  {
    area: "Marketing Center",
    status: "❌",
    notes: "GA4, LinkedIn integrations, and campaign tracking not shipped.",
  },
  {
    area: "Analytics Stack",
    status: "❌",
    notes: "ROI endpoints and dashboard visualizations missing.",
  },
  {
    area: "Security & Compliance",
    status: "❌",
    notes: "S3 audit logs, webhook signatures, and AV hooks incomplete.",
  },
  {
    area: "Platform Infrastructure",
    status: "❌",
    notes: "Playwright smoke tests and legacy route cleanup unresolved.",
  },
];

const run = async () => {
  const reportDir = path.join(process.cwd(), "reports");
  await fs.mkdir(reportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace("T", " ").replace(/\..*/, " UTC");

  const lines = [
    "# Staff Application Installed Features — Automated Snapshot",
    `Generated: ${timestamp}`,
    "",
    "| Feature Area | Status | Notes |",
    "|---------------|---------|-------|",
    ...featureStatuses.map(({ area, status, notes }) => `| ${area} | ${status} | ${notes} |`),
  ];

  const reportPath = path.join(reportDir, "staff_installed_features_status.md");
  await fs.writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Updated staff feature summary at ${reportPath}`);
};

run().catch((error) => {
  console.error("Failed to generate Codex summary report:", error);
  process.exitCode = 1;
});
