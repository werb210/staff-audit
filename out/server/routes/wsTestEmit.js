import { Router } from "express";
import { emitLenderProductsUpdate, emitApplicationsUpdate, emitPipelineUpdate } from "../websocket";
const router = Router();
router.post("/", (req, res) => {
    const { eventType } = req.body;
    try {
        switch (eventType) {
            case "lender-products:update":
                emitLenderProductsUpdate();
                break;
            case "applications:update":
                emitApplicationsUpdate();
                break;
            case "pipeline:update":
                emitPipelineUpdate();
                break;
            default:
                return res.status(400).json({ error: "Unknown event type" });
        }
        console.log(`🧪 [WS-TEST] Emitted ${eventType} event`);
        res.json({ success: true, eventType });
    }
    catch (error) {
        console.error(`❌ [WS-TEST] Failed to emit ${eventType}:`, error);
        res.status(500).json({ error: "Failed to emit event" });
    }
});
export default router;
