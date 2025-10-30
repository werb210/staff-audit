import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";
import { getContactMergeVars } from "../../services/mergeFieldsV2";
import { renderLiquid } from "../../services/templateEngineV2";
import { sendUserEmail } from "../../services/graphEmail";
const router = Router();
// send SMS to contact using a template
router.post("/send-sms", async (req, res) => {
    const { contactId, templateId } = req.body || {};
    if (!contactId || !templateId)
        return res.status(400).json({ error: "Missing fields" });
    const [t] = await q(`SELECT * FROM comm_templates WHERE id=$1 LIMIT 1`, [templateId]);
    if (!t || t.channel !== "sms")
        return res.status(400).json({ error: "Bad template" });
    const vars = await getContactMergeVars(contactId);
    const body = await renderLiquid(t.body, vars);
    // reuse your existing SMS send route service
    const phone = vars.ContactPhone;
    const r = await fetch("http://localhost:" + process.env.PORT + "/api/comms/sms/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, toNumber: phone, body })
    });
    const data = await r.json();
    res.json({ ok: true, threadId: data.threadId });
});
// send email to lender org admin using a template
router.post("/send-email", async (req, res) => {
    const { orgId, templateId, toEmail } = req.body || {};
    if (!orgId || !templateId || !toEmail)
        return res.status(400).json({ error: "Missing fields" });
    const [t] = await q(`SELECT * FROM comm_templates WHERE id=$1 LIMIT 1`, [templateId]);
    if (!t || t.channel !== "email")
        return res.status(400).json({ error: "Bad template" });
    const body = await renderLiquid(t.body, { Now: new Date().toISOString() });
    const subject = t.subject ? await renderLiquid(t.subject, { Now: new Date().toISOString() }) : "Reminder";
    await sendUserEmail({ userId: req.user?.id, toEmail, subject, htmlBody: body });
    res.json({ ok: true });
});
export default router;
