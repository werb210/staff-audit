import express from "express";
import { sendMail, createEvent, proposeSimpleTimes } from "../lib/graph";
import { draftReply, wrapUp, cueCards, inmailDraft, docKit } from "../lib/aiProvider";
import { presignUpload } from "../lib/s3PutPresign";
const r = express.Router();
// Helper: read delegated token if your SPA passes it (optional)
function userToken(req) { return req.headers["x-ms-user-token"] || undefined; }
/** EMAIL (O365) */
r.post("/email/send", async (req, res, next) => {
    try {
        const { to = [], cc = [], bcc = [], subject = "", html = "", fromUPN } = req.body || {};
        await sendMail({ userAccessToken: userToken(req), fromUserPrincipal: fromUPN, to, cc, bcc, subject, html });
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
/** MEETING (Teams) */
r.post("/meeting/create", async (req, res, next) => {
    try {
        const { subject, startISO, endISO, attendees = [], bodyHTML = "" } = req.body || {};
        const out = await createEvent({ userAccessToken: userToken(req), subject, startISO, endISO, attendees, isTeams: true, bodyHTML });
        res.json(out);
    }
    catch (e) {
        next(e);
    }
});
/** PROPOSE TIMES (simple; swap later for true free/busy) */
r.get("/meeting/propose-times", async (_req, res) => { res.json({ slots: proposeSimpleTimes(3) }); });
/** AI: Draft reply / Wrap-up / Cue cards / LinkedIn draft */
r.post("/ai/draft-reply", async (req, res) => { res.json({ text: await draftReply(req.body || {}) }); });
r.post("/ai/wrap-up", async (req, res) => { res.json({ text: await wrapUp(req.body || {}) }); });
r.post("/ai/cue-cards", async (req, res) => { res.json({ text: await cueCards(req.body || {}) }); });
r.post("/ai/inmail-draft", async (req, res) => { res.json({ text: await inmailDraft(req.body || {}) }); });
/** Doc Kit + upload links */
r.post("/doc-kit", async (req, res, next) => {
    try {
        const { contact = {}, files = [] } = req.body || {};
        const checklist = docKit(contact);
        // Optional: presign uploads for each requested filename
        const links = await Promise.all((files || []).map(async (f) => presignUpload(`uploads/${contact?.id || "anon"}/${Date.now()}-${f.name}`, f.contentType || "application/pdf")));
        res.json({ checklist, uploads: links });
    }
    catch (e) {
        next(e);
    }
});
/** LinkedIn helper links (no scraping; deep links only) */
r.get("/linkedin/links", async (req, res) => {
    const { profileUrl = "", companyDomain = "", companyUrn = "" } = req.query;
    const q = encodeURIComponent(companyDomain || "");
    res.json({
        profile: profileUrl || null,
        salesNavigator: profileUrl ? profileUrl.replace("www.linkedin.com/in/", "www.linkedin.com/sales/people/") : null,
        peopleAtCompany: q ? `https://www.linkedin.com/search/results/people/?currentCompany=%22${q}%22` : null,
        recentPosts: profileUrl ? `${profileUrl}recent-activity/all/` : null
    });
});
export default r;
