import { Router } from "express";
import { reportError } from "../../services/errors/reporter";
const router = Router();
router.post("/errors/browser", async (req, res) => {
    await reportError({ message: req.body?.message || "browser_error" }, { kind: "BrowserError", route: req.body?.route, meta: req.body });
    res.json({ ok: true });
});
export default router;
