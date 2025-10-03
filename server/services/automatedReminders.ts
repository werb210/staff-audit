import dayjs from "dayjs";
const q = pool.query.bind(pool);
import { pool } from "../db/pool";
import { renderLiquid } from "./templateEngine";
import { getContactMergeVars, mergeVars } from "./mergeFields";
// Import communication services (implement as needed)
async function sendSystemSMS({ to, message, source }: { to: string; message: string; source: string }) {
  console.log(`[SMS] ${source}: ${to} - ${message.slice(0, 50)}...`);
  // TODO: Implement with Twilio service
}

async function sendSystemEmail({ to, subject, html, source }: { to: string[]; subject: string; html: string; source: string }) {
  console.log(`[EMAIL] ${source}: ${to.join(',')} - ${subject}`);
  // TODO: Implement with SendGrid service
}

const tz = process.env.TIMEZONE || "America/Edmonton";
const bizStart = process.env.BIZ_HOURS_START || "09:00";
const bizEnd = process.env.BIZ_HOURS_END || "18:00";
const bizDays = (process.env.BIZ_DAYS || "1,2,3,4,5").split(",").map(Number); // Mon-Fri

function isBusinessHours(date: Date): boolean {
  const d = dayjs(date).tz(tz);
  const dow = d.day(); // 0=Sun, 1=Mon, ...
  if (!bizDays.includes(dow)) return false;
  
  const time = d.format("HH:mm");
  return time >= bizStart && time <= bizEnd;
}

function nextBusinessHour(from: Date): Date {
  let next = dayjs(from).tz(tz);
  
  // If outside business hours, move to next business day start
  while (!isBusinessHours(next.toDate())) {
    if (next.format("HH:mm") >= bizEnd || !bizDays.includes(next.day())) {
      // Move to next business day at start time
      next = next.add(1, 'day').hour(Number(bizStart.split(':')[0])).minute(Number(bizStart.split(':')[1]));
    } else if (next.format("HH:mm") < bizStart) {
      // Same day, move to business start
      next = next.hour(Number(bizStart.split(':')[0])).minute(Number(bizStart.split(':')[1]));
    }
  }
  return next.toDate();
}

export async function scheduleReminder({
  targetType,
  targetId,
  channel,
  templateId,
  delayHours = 24,
  vars = {}
}: {
  targetType: "contact" | "thread" | "application" | "lender_org";
  targetId: string;
  channel: "sms" | "email";
  templateId: string;
  delayHours?: number;
  vars?: Record<string, any>;
}) {
  const scheduledFor = nextBusinessHour(new Date(Date.now() + delayHours * 60 * 60 * 1000));
  
  await q(`
    INSERT INTO reminders_queue(target_type, target_id, channel, template_id, scheduled_for)
    VALUES ($1, $2, $3, $4, $5)
  `, [targetType, targetId, channel, templateId, scheduledFor]);
}

export async function processReminders() {
  const now = new Date();
  const pending = await q<any>(`
    SELECT * FROM reminders_queue 
    WHERE status = 'queued' AND scheduled_for <= $1
    ORDER BY scheduled_for ASC
    LIMIT 50
  `, [now]);

  for (const reminder of pending) {
    try {
      await q(`UPDATE reminders_queue SET status='processing' WHERE id=$1`, [reminder.id]);
      
      // Get template
      const [tpl] = await q<any>(`SELECT * FROM comm_templates WHERE id=$1 LIMIT 1`, [reminder.template_id]);
      if (!tpl) {
        await q(`UPDATE reminders_queue SET status='failed', last_error='Template not found' WHERE id=$1`, [reminder.id]);
        continue;
      }

      // Get target contact info based on type
      let contactId = reminder.target_id;
      if (reminder.target_type === "application") {
        const [app] = await q<any>(`SELECT contact_id FROM applications WHERE id=$1 LIMIT 1`, [reminder.target_id]);
        contactId = app?.contact_id;
      } else if (reminder.target_type === "thread") {
        const [thread] = await q<any>(`SELECT contact_id FROM comm_threads WHERE id=$1 LIMIT 1`, [reminder.target_id]);
        contactId = thread?.contact_id;
      }

      if (!contactId) {
        await q(`UPDATE reminders_queue SET status='failed', last_error='Contact not found' WHERE id=$1`, [reminder.id]);
        continue;
      }

      // Check opt-out for SMS
      if (reminder.channel === "sms") {
        const [contact] = await q<any>(`SELECT sms_opt_out FROM contacts WHERE id=$1 LIMIT 1`, [contactId]);
        if (contact?.sms_opt_out) {
          await q(`UPDATE reminders_queue SET status='skipped', last_error='SMS opt-out' WHERE id=$1`, [reminder.id]);
          continue;
        }
      }

      // Render template
      const baseVars = await getContactMergeVars(contactId, { execute: q });
      const context = mergeVars(reminder.vars || {}, baseVars);
      
      const subject = tpl.subject ? await renderLiquid(tpl.subject, context) : undefined;
      const body = await renderLiquid(tpl.body, context);

      // Send message
      if (reminder.channel === "sms") {
        await sendSystemSMS({
          to: baseVars.ContactPhone,
          message: body,
          source: "automated_reminder"
        });
      } else {
        await sendSystemEmail({
          to: [baseVars.ContactEmail],
          subject: subject || "Reminder",
          html: body,
          source: "automated_reminder"
        });
      }

      await q(`UPDATE reminders_queue SET status='sent', sent_at=now() WHERE id=$1`, [reminder.id]);
      
    } catch (error) {
      console.error(`[REMINDERS] Failed to process reminder ${reminder.id}:`, error);
      await q(`UPDATE reminders_queue SET status='failed', last_error=$1 WHERE id=$2`, [String(error), reminder.id]);
    }
  }
}