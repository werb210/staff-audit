import webpush from "web-push";
import twilio from "twilio";
import { db } from "../db.js";
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_BF_SMS_NUMBER } = process.env;
// Only set VAPID details if keys are available
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT || "mailto:ops@boreal.financial", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
else {
    console.log('📱 [VAPID] VAPID keys not configured, push notifications disabled');
}
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
export async function sendSMS(toE164, body) {
    const from = TWILIO_BF_SMS_NUMBER;
    const res = await twilioClient.messages.create({ from, to: toE164, body });
    return { sid: res.sid };
}
export async function sendPush(target, payload) {
    await webpush.sendNotification({ endpoint: target.endpoint, keys: target.keys }, JSON.stringify(payload), { TTL: 30 });
}
export function templateForStage(event, ctx) {
    switch (event) {
        case "STAGE_NEW_SUBMITTED":
            return `${ctx.firstName || "Applicant"}, we received your application for ${ctx.business || "your business"}. We'll review and update you shortly.`;
        case "STAGE_IN_REVIEW":
            return `We are now reviewing your application. We'll update you shortly.`;
        case "DOC_REJECTED":
            return `One or more documents were rejected. Please upload the correct document via your portal.`;
        case "ALL_DOCS_ACCEPTED":
            return `All required documents approved. We're now engaging with lenders.`;
        case "SENT_TO_LENDER":
            return `Your application has been sent to lenders. Expect 2–4 days for responses.`;
    }
}
export function deepLinkFor(ctx) {
    const tab = ctx.tab || "application";
    return `/pipeline?silo=${ctx.silo}&appId=${ctx.appId}&tab=${tab}`;
}
// Helper functions for database operations
async function getStaffSubscribersForSilo(silo) {
    const { rows } = await db.query(`
    SELECT endpoint, p256dh, auth FROM push_subscriptions
    JOIN users ON users.id = push_subscriptions.user_id
    WHERE users.role IN ('Admin','Staff') AND (users.silo_access @> $1::text[] OR users.silo_access IS NULL)
  `, [[silo]]);
    return rows.map(r => ({
        endpoint: r.endpoint,
        keys: { p256dh: r.p256dh, auth: r.auth }
    }));
}
async function logDelivery(event_key, channel, to_ref, payload, status, error) {
    await db.query(`
    INSERT INTO notifications_log (event_key, channel, to_ref, payload, status, error)
    VALUES ($1,$2,$3,$4,$5,$6)
  `, [event_key, channel, to_ref, JSON.stringify(payload), status, error || null]);
}
export async function notifyStage(eventKey, ctx) {
    console.log(`📱 [NOTIFY] Processing stage event: ${eventKey} for app ${ctx.appId} in silo ${ctx.silo}`);
    // 1) Applicant SMS (BF number only)
    const smsBody = templateForStage(eventKey, ctx);
    if (ctx.applicantPhone) {
        try {
            const r = await sendSMS(ctx.applicantPhone, smsBody);
            await logDelivery(eventKey, "sms", ctx.applicantPhone, { body: smsBody }, "sent");
            console.log(`✅ [NOTIFY-SMS] Sent to ${ctx.applicantPhone}: ${r.sid}`);
        }
        catch (e) {
            await logDelivery(eventKey, "sms", ctx.applicantPhone, { body: smsBody }, "failed", e.message);
            console.error(`❌ [NOTIFY-SMS] Failed to send to ${ctx.applicantPhone}:`, e.message);
        }
    }
    // 2) Staff Push (silo-aware)
    const link = deepLinkFor(ctx);
    const payload = {
        title: eventKey.replace(/_/g, " "),
        body: smsBody,
        icon: "/icons/pwa-192.png",
        badge: "/icons/badge.png",
        data: { url: link, silo: ctx.silo },
    };
    const subs = await getStaffSubscribersForSilo(ctx.silo);
    console.log(`📱 [NOTIFY-PUSH] Found ${subs.length} staff subscribers for silo ${ctx.silo}`);
    await Promise.all(subs.map(async (s) => {
        try {
            await sendPush(s, payload);
            await logDelivery(eventKey, "push", s.endpoint, payload, "sent");
            console.log(`✅ [NOTIFY-PUSH] Sent to endpoint: ${s.endpoint.substring(0, 50)}...`);
        }
        catch (e) {
            await logDelivery(eventKey, "push", s.endpoint, payload, "failed", e.message);
            console.error(`❌ [NOTIFY-PUSH] Failed to send to endpoint:`, e.message);
        }
    }));
}
