import express from "express";
// ---------- In-memory stores (swap with DB when ready) ----------
const users = new Map();
const mailboxes = new Map();
const extToMailbox = new Map(); // extension -> mailboxId
const messages = [];
// Seed base data (admin, andrew, todd, marketing + intake)
seed();
function seed() {
    ensureMailbox({
        id: "intake",
        label: "Intake / Information",
        recipients: ["admin", "marketing", "andrew", "todd"], // admins also included here
    });
    ensureUser({
        id: "admin",
        name: "Admin",
        role: "admin",
        email: "admin@bf.local",
        phone: "",
        mailboxId: "admin",
        extension: "101",
    });
    ensureUser({
        id: "andrew",
        name: "Andrew Polturak",
        role: "user",
        email: "andrew@bf.local",
        phone: "",
        mailboxId: "andrew",
        extension: "102",
    });
    ensureUser({
        id: "todd",
        name: "Todd Werboweski",
        role: "user",
        email: "todd@bf.local",
        phone: "",
        mailboxId: "todd",
        extension: "103",
    });
    ensureUser({
        id: "marketing",
        name: "Marketing",
        role: "marketing",
        email: "marketing@bf.local",
        phone: "",
        mailboxId: "marketing",
        extension: "104",
    });
}
function ensureMailbox(mb) {
    if (!mailboxes.has(mb.id))
        mailboxes.set(mb.id, mb);
}
function ensureUser(u) {
    users.set(u.id, u);
    ensureMailbox({
        id: u.mailboxId,
        label: `${u.name} Voicemail`,
        recipients: [u.id],
    });
    extToMailbox.set(u.extension, u.mailboxId);
}
// ---------- Router factory ----------
export function createIVRRouter(io) {
    const router = express.Router();
    // Twilio voice webhooks use x-www-form-urlencoded
    router.use("/voice", express.urlencoded({ extended: false }));
    router.use(express.json());
    // Twilio optional runtime dependency (keeps build clean w/o SDK/env)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilioPkg = safeRequire("twilio");
    const VoiceResponse = twilioPkg?.twiml?.VoiceResponse ?? class {
        _parts = [];
        say(_optsOrText, maybeText) {
            const text = typeof _optsOrText === "string" ? _optsOrText : maybeText ?? "";
            this._parts.push(`<Say>${escapeXml(text)}</Say>`);
            return this;
        }
        gather(opts) {
            this._parts.push(`<Gather input="${opts?.input || "dtmf"}" numDigits="${opts?.numDigits || 1}" timeout="${opts?.timeout ?? 5}" action="${opts?.action}" />`);
            return this;
        }
        dial(opts) {
            // minimal Dial for compatibility – not used in this file
            this._parts.push(`<Dial callerId="${opts?.callerId || ""}">`);
            return {
                number: (n) => {
                    this._parts.push(`<Number>${escapeXml(n)}</Number></Dial>`);
                },
            };
        }
        record(opts) {
            this._parts.push(`<Record playBeep="${!!opts?.playBeep}" maxLength="${opts?.maxLength || 120}" trim="${opts?.trim || "do-not-trim"}" recordingStatusCallback="${opts?.recordingStatusCallback}" recordingStatusCallbackMethod="${opts?.recordingStatusCallbackMethod || "POST"}" />`);
            return this;
        }
        redirect(opts, url) {
            this._parts.push(`<Redirect method="${opts?.method || "POST"}">${escapeXml(url)}</Redirect>`);
            return this;
        }
        hangup() {
            this._parts.push("<Hangup/>");
            return this;
        }
        toString() {
            return `<?xml version="1.0" encoding="UTF-8"?><Response>${this._parts.join("")}</Response>`;
        }
    };
    const emit = (evt, payload) => io?.emit(evt, payload);
    const now = () => new Date().toISOString();
    const fromBF = process.env.TWILIO_NUMBER_BF || process.env.TWILIO_NUMBER || "";
    const fromSLF = process.env.TWILIO_NUMBER_SLF || process.env.TWILIO_NUMBER || "";
    const publicBase = process.env.PUBLIC_BASE_URL || "http://localhost:5000";
    // Notifications (optional)
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
    const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || "";
    const sg = SENDGRID_API_KEY ? safeRequire("@sendgrid/mail") : null;
    if (sg && SENDGRID_API_KEY)
        sg.setApiKey(SENDGRID_API_KEY);
    const twilioClient = twilioPkg && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
        ? twilioPkg(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        : null;
    // ---- Inbound entry (main IVR) ----
    router.post("/voice/inbound", (req, res) => {
        const tenant = req.query.tenant || tenantFromTo(req.body?.To);
        const vr = new VoiceResponse();
        const greeting = tenant === "slf" ? "Welcome to Site Level Financial." : "Welcome to Boreal Financial.";
        const g = vr.gather({
            input: "dtmf",
            numDigits: 1,
            timeout: 6,
            action: `${publicBase}/api/voice/ivr?tenant=${tenant}`,
        });
        g.say({ voice: "Polly.Joanna" }, `${greeting} For intake and general information, press 1. For Andrew Polturak, press 2. For Todd Werboweski, press 3. For the company directory, press 0.`);
        vr.say("We did not receive an entry.");
        vr.redirect({ method: "POST" }, `${publicBase}/api/voice/inbound?tenant=${tenant}`);
        res.type("text/xml").send(vr.toString());
    });
    // ---- Handle DTMF from main menu ----
    router.post("/voice/ivr", (req, res) => {
        const tenant = req.query.tenant || tenantFromTo(req.body?.To);
        const digits = req.body?.Digits || "";
        const vr = new VoiceResponse();
        if (digits === "1")
            return toMailbox(vr, "intake", tenant, res);
        if (digits === "2")
            return toMailbox(vr, "andrew", tenant, res);
        if (digits === "3")
            return toMailbox(vr, "todd", tenant, res);
        if (digits === "0") {
            const g = vr.gather({
                input: "dtmf",
                numDigits: 3,
                timeout: 8,
                action: `${publicBase}/api/voice/directory?tenant=${tenant}`,
            });
            g.say("Please enter the three digit extension, then press the pound key.");
            vr.redirect({ method: "POST" }, `${publicBase}/api/voice/inbound?tenant=${tenant}`);
            return res.type("text/xml").send(vr.toString());
        }
        vr.say("Invalid selection.");
        vr.redirect({ method: "POST" }, `${publicBase}/api/voice/inbound?tenant=${tenant}`);
        res.type("text/xml").send(vr.toString());
    });
    // ---- Directory (3-digit extensions) ----
    router.post("/voice/directory", (req, res) => {
        const tenant = req.query.tenant || tenantFromTo(req.body?.To);
        const ext = req.body?.Digits || "";
        const vr = new VoiceResponse();
        const mailboxId = extToMailbox.get(ext);
        if (!mailboxId) {
            vr.say("Extension not found.");
            vr.redirect({ method: "POST" }, `${publicBase}/api/voice/inbound?tenant=${tenant}`);
            return res.type("text/xml").send(vr.toString());
        }
        return toMailbox(vr, mailboxId, tenant, res);
    });
    // ---- Voicemail greeting + record ----
    router.post("/voice/voicemail", (req, res) => {
        const mailboxId = req.query.mb || "intake";
        const tenant = req.query.tenant || tenantFromTo(req.body?.To);
        const vr = new VoiceResponse();
        const box = mailboxes.get(mailboxId);
        const label = box?.label || "our voicemail box";
        vr.say(`Please leave a message for ${label} after the tone. Press any key to finish.`);
        vr.record({
            playBeep: true,
            maxLength: 120,
            trim: "do-not-trim",
            recordingStatusCallback: `${publicBase}/api/voice/voicemail-complete?mb=${encodeURIComponent(mailboxId)}&tenant=${tenant}`,
            recordingStatusCallbackMethod: "POST",
        });
        vr.say("We did not receive a recording. Goodbye.");
        vr.hangup();
        res.type("text/xml").send(vr.toString());
    });
    // ---- Recording complete webhook ----
    router.post("/voice/voicemail-complete", async (req, res) => {
        const mailboxId = req.query.mb || "intake";
        const tenant = req.query.tenant || tenantFromTo(req.body?.To);
        const recordingUrl = String(req.body?.RecordingUrl || "").replace(/^http:/, "https:");
        const duration = req.body?.RecordingDuration ? Number(req.body.RecordingDuration) : undefined;
        const from = req.body?.From;
        const vm = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            mailboxId,
            from,
            recordingUrl,
            durationSec: duration,
            createdAt: now(),
            read: false,
            tenant,
        };
        messages.unshift(vm);
        emit("vm:new", vm);
        await notifyMailbox(mailboxId, vm, twilioClient, TWILIO_MESSAGING_SERVICE_SID, sg);
        res.json({ ok: true });
    });
    // ---- REST: list mailboxes & messages ----
    router.get("/voice/mailboxes", (_req, res) => {
        const list = Array.from(mailboxes.values()).map((mb) => ({
            id: mb.id,
            label: mb.label,
            recipients: mb.recipients,
            unread: messages.filter((m) => m.mailboxId === mb.id && !m.read).length,
        }));
        res.json({ mailboxes: list });
    });
    router.get("/voice/mailbox/:mb/messages", (req, res) => {
        const mb = req.params.mb;
        res.json({ messages: messages.filter((m) => m.mailboxId === mb) });
    });
    router.post("/voice/mailbox/:mb/read", (req, res) => {
        const { id, read } = (req.body ?? {});
        if (id) {
            const msg = messages.find((m) => m.id === id && m.mailboxId === req.params.mb);
            if (msg)
                msg.read = !!read;
        }
        res.json({ ok: true });
    });
    router.delete("/voice/mailbox/:mb/messages/:id", (req, res) => {
        const { mb, id } = { mb: req.params.mb, id: req.params.id };
        const idx = messages.findIndex((m) => m.id === id && m.mailboxId === mb);
        if (idx >= 0)
            messages.splice(idx, 1);
        res.json({ ok: true });
    });
    // ---- Provision a new user → auto mailbox + extension + directory ----
    router.post("/voice/provision-user", (req, res) => {
        const { id, name, email, phone, role } = (req.body ?? {});
        if (!id || !name)
            return res.status(400).json({ ok: false, error: "id and name required" });
        const ext = nextExtension();
        const mailboxId = `mb_${id}`;
        const user = {
            id,
            name,
            email,
            phone,
            role: role || "user",
            mailboxId,
            extension: ext,
        };
        ensureUser(user);
        return res.status(201).json({ ok: true, user });
    });
    // ---------- Helpers ----------
    function tenantFromTo(to) {
        const s = String(to ?? "");
        if (fromSLF && s.includes(fromSLF))
            return "slf";
        return "bf";
    }
    function toMailbox(vr, mailboxId, tenant, res) {
        vr.redirect({ method: "POST" }, `${publicBase}/api/voice/voicemail?mb=${encodeURIComponent(mailboxId)}&tenant=${tenant}`);
        res.type("text/xml").send(vr.toString());
    }
    function nextExtension() {
        for (let n = 200; n < 1000; n++) {
            const s = String(n);
            if (!extToMailbox.has(s))
                return s;
        }
        return String((Date.now() % 1000)).padStart(3, "0");
    }
    return router;
}
// ---------- Utilities ----------
function escapeXml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
function safeRequire(name) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(name);
    }
    catch {
        return null;
    }
}
async function notifyMailbox(mbId, vm, twilioClient, messagingServiceSid, sendgrid) {
    // in-app
    // (emitted already via io in router)
    const box = mailboxes.get(mbId);
    if (!box)
        return;
    const recips = box.recipients
        .map((id) => users.get(id))
        .filter((u) => !!u);
    // SMS (optional)
    if (twilioClient && messagingServiceSid) {
        await Promise.all(recips
            .filter((u) => !!u.phone)
            .map((u) => twilioClient.messages.create({
            messagingServiceSid,
            to: u.phone,
            body: `📩 New voicemail in ${box.label} from ${vm.from || "unknown"} (${vm.durationSec || 0}s)`,
        }))).catch(() => { });
    }
    // Email (optional)
    if (sendgrid) {
        await Promise.all(recips
            .filter((u) => !!u.email)
            .map((u) => sendgrid.send({
            to: u.email,
            from: "no-reply@boreal.financial",
            subject: `New voicemail in ${box.label}`,
            html: `<p>You have a new voicemail in <b>${box.label}</b>.</p>
                   <p>From: ${vm.from || "Unknown"}<br/>Duration: ${vm.durationSec || 0}s</p>
                   <p><a href="${vm.recordingUrl}.mp3">Play recording</a></p>`,
        }))).catch(() => { });
    }
}
