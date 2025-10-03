import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5000/api",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    supportFile: false,
    video: false,
    screenshotOnRunFailure: false
  },
  env: {
    CLIENT_APP_SHARED_TOKEN: process.env.CLIENT_APP_SHARED_TOKEN || "test-token-for-cypress",
    TEMPLATE_ID_PROD: process.env.TEMPLATE_ID_PROD || "test-template-id"
  }
});