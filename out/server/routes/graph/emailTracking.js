import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";
const router = Router();
const PNG_1x1 = Buffer.from("89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6360000002000154A24F5D0000000049454E44AE426082", "hex");
router.get("/open/:id.png", async (req, res) => {
    const id = req.params.id;
    await q(`
    INSERT INTO email_opens(tracking_id, user_agent, ip)
    VALUES ($1::uuid, $2, $3)
  `, [id, req.get("user-agent") || "", req.ip || ""]);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(PNG_1x1);
});
// helper endpoint for counts
router.get("/opens/:id", async (req, res) => {
    const id = req.params.id;
    const [result] = await q(`
    SELECT COUNT(*)::int AS count FROM email_opens WHERE tracking_id = $1::uuid
  `, [id]);
    res.json({ trackingId: id, opens: result?.count ?? 0 });
});
export default router;
