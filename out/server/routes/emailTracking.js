import { Router } from "express";
import { communicationsDB } from "../lib/communicationsStore";
const router = Router();
// 1x1 pixel GIF for open tracking
const TRACKING_PIXEL = Buffer.from("R0lGODlhAQABAPAAAP///wAAACwAAAAAAQABAEACAkQBADs=", "base64");
// Open tracking endpoint
router.get("/open/:commId.gif", (req, res) => {
    try {
        const { commId } = req.params;
        // Log the open event
        communicationsDB.addTracking({
            kind: "open",
            commId,
            ua: String(req.headers['user-agent'] || ""),
            ip: String(req.ip || req.connection.remoteAddress || "")
        });
        console.log(`👁️ [EMAIL-OPEN] Communication ${commId} opened`);
        // Return 1x1 transparent GIF
        res.setHeader("Content-Type", "image/gif");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.end(TRACKING_PIXEL);
    }
    catch (error) {
        console.error("Error tracking email open:", error);
        res.setHeader("Content-Type", "image/gif");
        res.end(TRACKING_PIXEL);
    }
});
// Click tracking endpoint
router.get("/click/:commId", (req, res) => {
    try {
        const { commId } = req.params;
        const targetUrl = String(req.query.url || "");
        if (!targetUrl) {
            return res.status(400).send("Missing target URL");
        }
        // Validate URL
        try {
            new URL(targetUrl);
        }
        catch {
            return res.status(400).send("Invalid target URL");
        }
        // Log the click event
        communicationsDB.addTracking({
            kind: "click",
            commId,
            url: targetUrl,
            ua: String(req.headers['user-agent'] || ""),
            ip: String(req.ip || req.connection.remoteAddress || "")
        });
        console.log(`🔗 [EMAIL-CLICK] Communication ${commId} clicked: ${targetUrl}`);
        // Redirect to target URL
        res.redirect(targetUrl);
    }
    catch (error) {
        console.error("Error tracking email click:", error);
        res.status(500).send("Tracking error");
    }
});
export default router;
