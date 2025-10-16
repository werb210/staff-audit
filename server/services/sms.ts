import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import twilio from "twilio";

const BF_FROM = process.env.TWILIO_BF_FROM || process.env.BF_PHONE_E164 || "+18254511768";
const SLF_VOICE = process.env.TWILIO_SLF_VOICE || process.env.SLF_PHONE_E164 || "+17753146801";
const APPROVAL_TO = process.env.APPROVAL_NUMBER || "+15878881837";

const client = twilio(process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN);

// Stage/SMS automations: harden + throttle
export async function safeSend(fn: () => Promise<any>) {
  try { 
    return await fn(); 
  }
  catch (e:any) { 
    console.error("SMS_ERR", e?.message || e); 
    return { ok:false, error:"SMS_FAILED" }; 
  }
}

export async function requestApproval(body: string) {
  // Human-in-the-loop approval
  return safeSend(() => client.messages.create({ to: APPROVAL_TO, from: BF_FROM, body }));
}

export async function sendClientSMS(to: string, body: string, silo: "BF" | "SLF" = "BF") {
  const from = silo === "BF" ? BF_FROM : SLF_VOICE;
  return safeSend(() => client.messages.create({ to, from, body }));
}

// Legacy compatibility
export async function sendSmsSafe(to: string, msg: string, brand: "BF" | "SLF" = "BF") {
  const now = new Date();
  const hour = now.getHours();
  const QUIET_START = 21, QUIET_END = 8; // local policy
  
  // Check opt-out status
  try {
    const { rows } = await db.execute(sql`SELECT opted_out FROM sms_optouts WHERE phone=${to} LIMIT 1`);
    if (rows?.[0]?.opted_out) {
      throw new Error("opted_out");
    }
  } catch (e) {
    // Table may not exist, continue
  }
  
  // Check quiet hours
  if (hour >= QUIET_START || hour < QUIET_END) {
    throw new Error("quiet_hours");
  }
  
  // Send SMS
  return await sendSms(to, msg, brand);
}

export async function sendSms(to: string, body: string, brand: "BF" | "SLF" = "BF") {
  const from = brand === "BF" ? BF_FROM : SLF_VOICE;

  try {
    const message = await client.messages.create({
      body,
      from,
      to,
      statusCallback: `${process.env.BASE_URL || 'https://localhost:5000'}/webhooks/twilio/sms/status`
    });
    
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('[SMS ERROR]', error);
    throw error;
  }
}