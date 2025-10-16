import express, { Request, Response, Router } from "express";
import type { Server as SocketIOServer } from "socket.io";

// ---------- Types ----------
type Role = "admin" | "user" | "marketing";
interface UserRec {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  mailboxId: string;
  extension: string; // 3-digit
}
interface Mailbox {
  id: string;
  label: string;
  recipients: string[]; // user ids that should be notified
  greeting?: string;
}
interface VM {
  id: string;
  mailboxId: string;
  from?: string;
  recordingUrl: string;
  durationSec?: number;
  createdAt: string;
  read: boolean;
  tenant: "bf" | "slf";
  transcriptionText?: string;
}

// ---------- In-memory stores (swap with DB when ready) ----------
const users = new Map<string, UserRec>();
const mailboxes = new Map<string, Mailbox>();
const extToMailbox = new Map<string, string>(); // extension -> mailboxId
const messages: VM[] = [];

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

function ensureMailbox(mb: Mailbox) {
  if (!mailboxes.has(mb.id)) mailboxes.set(mb.id, mb);
}

function ensureUser(u: UserRec) {
  users.set(u.id, u);
  ensureMailbox({
    id: u.mailboxId,
    label: `${u.name} Voicemail`,
    recipients: [u.id],
  });
  extToMailbox.set(u.extension, u.mailboxId);
}

// ---------- Router factory ----------
export function createIVRRouter(io?: SocketIOServer): Router {
  const router = express.Router();

  // Twilio voice webhooks use x-www-form-urlencoded
  router.use("/voice", express.urlencoded({ extended: false }));
  router.use(express.json());

  // Twilio optional runtime dependency (keeps build clean w/o SDK/env)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilioPkg: any = safeRequire("twilio");
  const VoiceResponse: any = twilioPkg?.twiml?.VoiceResponse ?? class {
    private _parts: string[] = [];
    say(_optsOrText: any, maybeText?: string) {
      const text = typeof _optsOrText === "string" ? _optsOrText : maybeText ?? "";
      this._parts.push(`<Say>${escapeXml(text)}</Say>`);
      return this;
    }
    gather(opts: any) {
      this._parts.push(
        `<Gather input="${opts?.input || "dtmf"}" numDigits="${opts?.numDigits || 1}" timeout="${
          opts?.timeout ?? 5
        }" action="${opts?.action}" />`
      );
      return this;
    }
    dial(opts: any) {
      // minimal Dial for compatibility – not used in this file
      this._parts.push(`<Dial callerId="${opts?.callerId || ""}">`);
      return {
        number: (n: string) => {
          this._parts.push(`<Number>${escapeXml(n)}</Number></Dial>`);
        },
      };
    }
    record(opts: any) {
      this._parts.push(
        `<Record playBeep="${!!opts?.playBeep}" maxLength="${opts?.maxLength || 120}" trim="${
          opts?.trim || "do-not-trim"
        }" recordingStatusCallback="${opts?.recordingStatusCallback}" recordingStatusCallbackMethod="${
          opts?.recordingStatusCallbackMethod || "POST"
        }" />`
      );
      return this;
    }
    redirect(opts: any, url: string) {
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

  const emit = (evt: string, payload: unknown) => io?.emit(evt, payload);
  const now = () => new Date().toISOString();

  const fromBF = process.env.TWILIO_NUMBER_BF || process.env.TWILIO_NUMBER || "";
  const fromSLF = process.env.TWILIO_NUMBER_SLF || process.env.TWILIO_NUMBER || "";
  const publicBase = process.env.PUBLIC_BASE_URL || "http://localhost:5000";

  // Notifications (optional)
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
  const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || "";
  const sg: any = SENDGRID_API_KEY ? safeRequire("@sendgrid/mail") : null;
  if (sg && SENDGRID_API_KEY) sg.setApiKey(SENDGRID_API_KEY);

  const twilioClient: any =
    twilioPkg && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilioPkg(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;

  // ---- Inbound entry (main IVR) ----
  router.post("/voice/inbound", (req: Request, res: Response) => {
    const tenant = (req.query.tenant as "bf" | "slf") || tenantFromTo(req.body?.To);
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
  router.post("/voice/ivr", (req: Request, res: Response) => {
    const tenant = (req.query.tenant as "bf" | "slf") || tenantFromTo(req.body?.To);
    const digits: string = (req.body?.Digits as string) || "";
    const vr = new VoiceResponse();

    if (digits === "1") return toMailbox(vr, "intake", tenant, res);
    if (digits === "2") return toMailbox(vr, "andrew", tenant, res);
    if (digits === "3") return toMailbox(vr, "todd", tenant, res);

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
  router.post("/voice/directory", (req: Request, res: Response) => {
    const tenant = (req.query.tenant as "bf" | "slf") || tenantFromTo(req.body?.To);
    const ext = (req.body?.Digits as string) || "";
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
  router.post("/voice/voicemail", (req: Request, res: Response) => {
    const mailboxId = (req.query.mb as string) || "intake";
    const tenant = (req.query.tenant as "bf" | "slf") || tenantFromTo(req.body?.To);
    const vr = new VoiceResponse();

    const box = mailboxes.get(mailboxId);
    const label = box?.label || "our voicemail box";

    vr.say(`Please leave a message for ${label} after the tone. Press any key to finish.`);
    vr.record({
      playBeep: true,
      maxLength: 120,
      trim: "do-not-trim",
      recordingStatusCallback: `${publicBase}/api/voice/voicemail-complete?mb=${encodeURIComponent(
        mailboxId
      )}&tenant=${tenant}`,
      recordingStatusCallbackMethod: "POST",
    });
    vr.say("We did not receive a recording. Goodbye.");
    vr.hangup();

    res.type("text/xml").send(vr.toString());
  });

  // ---- Recording complete webhook ----
  router.post("/voice/voicemail-complete", async (req: Request, res: Response) => {
    const mailboxId = (req.query.mb as string) || "intake";
    const tenant = (req.query.tenant as "bf" | "slf") || tenantFromTo(req.body?.To);

    const recordingUrl = String(req.body?.RecordingUrl || "").replace(/^http:/, "https:");
    const duration = req.body?.RecordingDuration ? Number(req.body.RecordingDuration) : undefined;
    const from = req.body?.From as string | undefined;

    const vm: VM = {
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
  router.get("/voice/mailboxes", (_req: Request, res: Response) => {
    const list = Array.from(mailboxes.values()).map((mb) => ({
      id: mb.id,
      label: mb.label,
      recipients: mb.recipients,
      unread: messages.filter((m) => m.mailboxId === mb.id && !m.read).length,
    }));
    res.json({ mailboxes: list });
  });

  router.get("/voice/mailbox/:mb/messages", (req: Request, res: Response) => {
    const mb = req.params.mb;
    res.json({ messages: messages.filter((m) => m.mailboxId === mb) });
  });

  router.post("/voice/mailbox/:mb/read", (req: Request, res: Response) => {
    const { id, read } = (req.body ?? {}) as { id?: string; read?: boolean };
    if (id) {
      const msg = messages.find((m) => m.id === id && m.mailboxId === req.params.mb);
      if (msg) msg.read = !!read;
    }
    res.json({ ok: true });
  });

  router.delete("/voice/mailbox/:mb/messages/:id", (req: Request, res: Response) => {
    const { mb, id } = { mb: req.params.mb, id: req.params.id };
    const idx = messages.findIndex((m) => m.id === id && m.mailboxId === mb);
    if (idx >= 0) messages.splice(idx, 1);
    res.json({ ok: true });
  });

  // ---- Provision a new user → auto mailbox + extension + directory ----
  router.post("/voice/provision-user", (req: Request, res: Response) => {
    const { id, name, email, phone, role } = (req.body ?? {}) as Partial<UserRec> & {
      role?: Role;
    };
    if (!id || !name) return res.status(400).json({ ok: false, error: "id and name required" });

    const ext = nextExtension();
    const mailboxId = `mb_${id}`;

    const user: UserRec = {
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
  function tenantFromTo(to?: string): "bf" | "slf" {
    const s = String(to ?? "");
    if (fromSLF && s.includes(fromSLF)) return "slf";
    return "bf";
  }

  function toMailbox(vr: any, mailboxId: string, tenant: "bf" | "slf", res: Response) {
    vr.redirect({ method: "POST" }, `${publicBase}/api/voice/voicemail?mb=${encodeURIComponent(mailboxId)}&tenant=${tenant}`);
    res.type("text/xml").send(vr.toString());
  }

  function nextExtension(): string {
    for (let n = 200; n < 1000; n++) {
      const s = String(n);
      if (!extToMailbox.has(s)) return s;
    }
    return String((Date.now() % 1000)).padStart(3, "0");
  }

  return router;
}

// ---------- Utilities ----------
function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function safeRequire(name: string): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(name);
  } catch {
    return null;
  }
}

async function notifyMailbox(
  mbId: string,
  vm: VM,
  twilioClient: any,
  messagingServiceSid: string,
  sendgrid: any
) {
  // in-app
  // (emitted already via io in router)
  const box = mailboxes.get(mbId);
  if (!box) return;

  const recips = box.recipients
    .map((id) => users.get(id))
    .filter((u): u is UserRec => !!u);

  // SMS (optional)
  if (twilioClient && messagingServiceSid) {
    await Promise.all(
      recips
        .filter((u) => !!u.phone)
        .map((u) =>
          twilioClient.messages.create({
            messagingServiceSid,
            to: u.phone!,
            body: `📩 New voicemail in ${box.label} from ${vm.from || "unknown"} (${vm.durationSec || 0}s)`,
          })
        )
    ).catch(() => {});
  }

  // Email (optional)
  if (sendgrid) {
    await Promise.all(
      recips
        .filter((u) => !!u.email)
        .map((u) =>
          sendgrid.send({
            to: u.email!,
            from: "no-reply@boreal.financial",
            subject: `New voicemail in ${box.label}`,
            html: `<p>You have a new voicemail in <b>${box.label}</b>.</p>
                   <p>From: ${vm.from || "Unknown"}<br/>Duration: ${vm.durationSec || 0}s</p>
                   <p><a href="${vm.recordingUrl}.mp3">Play recording</a></p>`,
          })
        )
    ).catch(() => {});
  }
}