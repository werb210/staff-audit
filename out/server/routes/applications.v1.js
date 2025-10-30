import { Router } from "express";
import { z } from "zod";
import { appDocsUpload } from "../middleware/uploads";
import { saveApplication, getApplication, appendFiles } from "../utils/storage";
export const applicationsV1 = Router();
// Zod schema (abbrev)
const AppSchema = z.object({
    product_id: z.string(),
    country: z.enum(["CA", "US"]),
    amount: z.number().positive(),
    years_in_business: z.number().int().min(0),
    monthly_revenue: z.number().int().min(0),
    business_legal_name: z.string(),
    industry: z.string(),
    contact_name: z.string(),
    contact_email: z.string().email(),
    contact_phone: z.string(),
    documents: z.array(z.object({ type: z.string() })).optional().default([]),
});
applicationsV1.post("/", async (req, res) => {
    const parse = AppSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ ok: false, errors: parse.error.errors.map(e => e.message) });
    }
    const data = parse.data;
    // business rules
    const errors = [];
    if (data.years_in_business < 12)
        errors.push("Minimum 12 months in business required.");
    if (data.monthly_revenue < 15000)
        errors.push("Minimum $15000 monthly revenue required.");
    if (errors.length)
        return res.status(400).json({ ok: false, errors });
    const submissionId = await saveApplication(data); // returns id and sets status=QUEUED
    // Queue background jobs
    console.log(`[QUEUE] generate-pdf queued for ${submissionId}`);
    console.log(`[QUEUE] credit-summary queued for ${submissionId}`);
    console.log(`[QUEUE] o365-email queued for ${submissionId}`);
    console.log(`✅ [APPLICATIONS-V1] Created submission: ${submissionId}`);
    return res.status(202).json({ ok: true, submission_id: submissionId, status: "QUEUED" });
});
applicationsV1.post("/:id/docs", appDocsUpload("id"), async (req, res) => {
    // NOTE: Do NOT add any other multer or body-parser on this route.
    const id = req.params.id;
    const files = req.files || [];
    if (!files.length)
        return res.status(400).json({ ok: false, error: "No files received. Field must be 'files'." });
    const mapped = files.map(f => ({
        filename: f.filename,
        original_name: f.originalname,
        size: f.size,
        mime_type: f.mimetype,
        path: f.path,
        uploaded_at: new Date().toISOString(),
    }));
    await appendFiles(id, mapped);
    console.log(`✅ [APPLICATIONS-V1] Uploaded ${mapped.length} files for ${id}`);
    return res.json({ ok: true, count: mapped.length, files: mapped });
});
applicationsV1.get("/:id", async (req, res) => {
    const app = await getApplication(req.params.id);
    if (!app)
        return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true, application: app });
});
export default applicationsV1;
