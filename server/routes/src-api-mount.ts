// Mount client integration API routes
import { Router } from "express";

const router = Router();

// Mount simplified client integration API for testing
async function mountClientIntegrationRoutes() {
  try {
    // Mount the simplified test router
    const clientIntegrationRouter = (await import("./client-integration-test.js")).default;
    router.use("/public/client-api/applications", clientIntegrationRouter);
    
    console.log("✅ Client integration API routes mounted under /public/client-api");
  } catch (e) {
    console.log("❌ Failed to mount client integration API routes:", e.message);
    console.error(e);
  }
}

// Mount routes immediately
mountClientIntegrationRoutes();

export default router;