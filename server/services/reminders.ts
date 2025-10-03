import dayjs from "dayjs";
const q = pool.query.bind(pool);
import { pool } from "../db/pool";

function withinBizHours(d: Date) {
  const [hStart, mStart] = (process.env.BIZ_HOURS_START || "09:00").split(":").map(Number);
  const [hEnd, mEnd] = (process.env.BIZ_HOURS_END || "18:00").split(":").map(Number);
  const wd = d.getDay(); // 0=Sun
  const allowedDays = (process.env.BIZ_DAYS || "1,2,3,4,5").split(",").map(Number);
  if (!allowedDays.includes(wd)) return false;
  const t = d.getHours() * 60 + d.getMinutes();
  const start = hStart*60 + mStart;
  const end = hEnd*60 + mEnd;
  return t >= start && t <= end;
}

export async function scanAndQueueReminders() {
  const now = new Date();

  // 1) Applicants with missing docs for >= 24h since last request, not opted-out
  const applicants = await q<any>(`
    SELECT c.id as contact_id, a.id as application_id
    FROM applications a
    JOIN contacts c ON c.id=a.contact_id
    WHERE EXISTS (
      SELECT 1 FROM documents d WHERE d.application_id=a.id AND d.status IN ('pending','rejected')
    ) AND c.sms_opt_out=false
      AND (a.updated_at < now() - interval '24 hours')
    LIMIT 200
  `);
  for (const r of applicants) {
    const when = withinBizHours(now) ? now : dayjs(now).hour(Number((process.env.BIZ_HOURS_START||"09:00").split(":")[0])).minute(0).second(0).add(1,'day').toDate();
    await q(`
      INSERT INTO reminders_queue(target_type, target_id, channel, template_id, scheduled_for)
      SELECT 'contact', $1, 'sms', t.id, $2
      FROM comm_templates t
      WHERE t.kind='automation' AND t.channel='sms' AND t.name='Applicant Missing Docs Nudge'
      ON CONFLICT DO NOTHING
    `, [r.contact_id, when]);
  }

  // 2) Lenders with no decision after 48h (simplified - may not have these tables)
  try {
    const lenders = await q<any>(`
      SELECT DISTINCT laa.org_id
      FROM lender_app_access laa
      JOIN applications a ON a.id=laa.application_id
      LEFT JOIN lender_matches m ON m.application_id=a.id
      WHERE a.sent_to_lender_at < now() - interval '48 hours'
        AND (m.decision IS NULL OR m.decision='')
      LIMIT 200
    `);
    for (const r of lenders) {
      const when = withinBizHours(now) ? now : dayjs(now).add(1,'day').toDate();
      await q(`
        INSERT INTO reminders_queue(target_type, target_id, channel, template_id, scheduled_for)
        SELECT 'lender_org', $1, 'email', t.id, $2
        FROM comm_templates t
        WHERE t.kind='automation' AND t.channel='email' AND t.name='Lender Decision Nudge'
        ON CONFLICT DO NOTHING
      `, [r.org_id, when]);
    }
  } catch (e) {
    console.log("[Reminders] Skipping lender reminders - tables may not exist");
  }
}

export async function sendDueReminders() {
  const due = await q<any>(`
    SELECT rq.id, rq.target_type, rq.target_id, rq.channel, rq.template_id
    FROM reminders_queue rq
    WHERE rq.status='queued' AND rq.scheduled_for <= now()
    ORDER BY rq.scheduled_for
    LIMIT 100
  `);

  for (const reminder of due) {
    try {
      if (reminder.channel === "sms") {
        // resolve contact phone + vars
        const [contact] = await q<any>(`SELECT id, phone, sms_opt_out FROM contacts WHERE id=$1 LIMIT 1`, [reminder.target_id]);
        if (!contact || contact.sms_opt_out) {
          await q(`UPDATE reminders_queue SET status='skipped', last_error='opt-out or no phone' WHERE id=$1`, [reminder.id]);
          continue;
        }
        const payload = { contactId: contact.id, templateId: reminder.template_id };
        await fetch("http://localhost:"+process.env.PORT+"/api/automations/send-sms", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      } else {
        // lender org email: resolve primary email (may fail if tables don't exist)
        try {
          const [lender] = await q<any>(`SELECT email FROM lender_users WHERE org_id=$1 AND is_admin=true ORDER BY created_at LIMIT 1`, [reminder.target_id]);
          const email = lender?.email;
          if (!email) {
            await q(`UPDATE reminders_queue SET status='skipped', last_error='no lender admin email' WHERE id=$1`, [reminder.id]);
            continue;
          }
          const payload = { orgId: reminder.target_id, templateId: reminder.template_id, toEmail: email };
          await fetch("http://localhost:"+process.env.PORT+"/api/automations/send-email", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
        } catch (e) {
          await q(`UPDATE reminders_queue SET status='skipped', last_error='lender table missing' WHERE id=$1`, [reminder.id]);
          continue;
        }
      }
      await q(`UPDATE reminders_queue SET status='sent', sent_at=now() WHERE id=$1`, [reminder.id]);
    } catch (e:any) {
      await q(`UPDATE reminders_queue SET status='failed', last_error=$1 WHERE id=$2`, [e?.message || "error", reminder.id]);
    }
  }
}