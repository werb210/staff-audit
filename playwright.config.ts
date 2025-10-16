import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/ui",
  timeout: 45000,
  fullyParallel: true,
  reporter: [
    ["list"],
    ["json", { outputFile: "tests/artifacts/ui-results.json" }],
    ["html", { outputFolder: "tests/artifacts/html-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5000",
    headless: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  outputDir: "tests/artifacts/run",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
