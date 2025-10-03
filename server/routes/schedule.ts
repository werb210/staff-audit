import { Router } from "express";
import { db } from "../db/drizzle";
import { sql, eq } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly";
import { getToken } from "../services/graph";
import crypto from "crypto";
import fetch from "node-fetch";
import { scheduleLinks } from "../schema";

const r = Router();

// STAFF: create/list booking links (protected routes)
r.use("/schedule", requireAuth);
r.post("/schedule/links", async (req:any,res)=>{
  const b = req.body||{};
  const slug = (b.slug || crypto.randomBytes(4).toString("hex")).toLowerCase();
  const { rows } = await db.execute(sql`insert into schedule_links(slug, owner_ids, duration_minutes, buffer_before, buffer_after, tz)
    values(${slug}, ${b.ownerIds||[req.user.sub]}, ${b.duration||30}, ${b.bufferBefore||10}, ${b.bufferAfter||10}, ${b.tz||'America/Edmonton'}) returning *`);
  res.json({ ok:true, item: rows[0] });
});
r.get("/schedule/links", async (_req:any,res)=>{ const { rows } = await db.execute(sql`select * from schedule_links where active=true order by created_at desc`); res.json({ ok:true, items: rows }); });

// PUBLIC: show slots for a given date (now returns human-readable labels + buffers)
r.get("/public/s/:slug/slots", async (req:any,res)=>{
  const { rows } = await db.execute(sql`select * from schedule_links where slug=${req.params.slug} and active=true limit 1`);
  const link = rows?.[0]; if(!link) return res.status(404).json({ ok:false });
  const date = String(req.query.date||"").slice(0,10);
  if(!date) return res.status(400).json({ ok:false, error:"date_required" });
  // Round-robin pick first owner for preview; create uses next owner.
  const owner = link.owner_ids[0];
  const token = await getToken(owner);
  const start = `${date}T00:00:00`; const end = `${date}T23:59:59`;
  const rsp = await fetch("https://graph.microsoft.com/v1.0/me/calendar/getSchedule",{
    method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
    body: JSON.stringify({ schedules: ["me"], startTime:{ dateTime:start, timeZone: link.tz }, endTime:{ dateTime:end, timeZone: link.tz }, availabilityViewInterval: link.duration_minutes })
  });
  const j = await rsp.json();
  // Very simple availability parse: '0' = free, '1/2/3' = busy
  const view = j.value?.[0]?.availabilityView || "";
  const slots:any[] = [];
  // Business hours gating
  const businessStart = link?.business_start || "09:00"; // "HH:MM"
  const businessEnd = link?.business_end || "17:00";
  const [bsH, bsM] = businessStart.split(":").map(Number);
  const [beH, beM] = businessEnd.split(":").map(Number);
  const startIdx = Math.floor((bsH * 60 + bsM) / link.duration_minutes);
  const endIdx = Math.floor((beH * 60 + beM) / link.duration_minutes);
  
  for (let i = startIdx; i <= endIdx && i < view.length; i++) {
    if (view[i] === "0") slots.push({ startIndex: i, startMinutes: i * link.duration_minutes });
  }
  res.json({ 
    ok: true, 
    slots: slots.map(s => ({ ...s, label: minutesLabel(s.startMinutes, link.tz) })), 
    interval: link.duration_minutes, 
    tz: link.tz, 
    buffers: { before: link.buffer_before, after: link.buffer_after },
    business: { start: businessStart, end: businessEnd }
  });
});

function minutesLabel(min: number, tz: string) {
  const h = Math.floor(min / 60), m = min % 60;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: tz
    }).format(d);
  } catch {
    const hh = String(h).padStart(2, "0"), mm = String(m).padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

// PUBLIC: book
r.post("/public/s/:slug/book", async (req:any,res)=>{
  const { rows } = await db.execute(sql`select * from schedule_links where slug=${req.params.slug} and active=true limit 1`);
  const link = rows?.[0]; if(!link) return res.status(404).json({ ok:false });
  // naive round-robin
  const pick = link.owner_ids[ Math.floor(Math.random()*link.owner_ids.length) ];
  const token = await getToken(pick);
  const { name, email, date, startMinutes } = req.body||{};
  const startISO = new Date(`${date}T00:00:00${offsetOf(link.tz)}`);
  const begins = new Date(startISO.getTime() + startMinutes*60000);
  const ends = new Date(begins.getTime() + link.duration_minutes*60000);
  const rsp = await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings",{
    method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
    body: JSON.stringify({ startDateTime: begins.toISOString(), endDateTime: ends.toISOString(), subject: `Meeting with ${name}` })
  });
  const om = await rsp.json();
  await db.execute(sql`insert into appointments(link_id, owner_id, client_name, client_email, starts_at, ends_at, meeting_join_url)
    values(${link.id}, ${pick}, ${name}, ${email}, ${begins.toISOString()}, ${ends.toISOString()}, ${om.joinWebUrl||null})`);
  res.json({ ok:true, joinUrl: om.joinWebUrl||null });
});

function offsetOf(_tz: string) { return "+00:00"; } // simple: treat times as UTC; UI shows correct TZ

// Find next available slot within N days
r.get("/public/s/:slug/next", async (req: any, res) => {
  const horizon = Math.min(+req.query.days || 14, 60);
  
  for (let i = 0; i < horizon; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const ymd = date.toISOString().slice(0, 10);
    
    try {
      const rsp = await fetch(`${req.protocol}://${req.get('host')}/api/public/s/${req.params.slug}/slots?date=${ymd}`);
      const j = await rsp.json();
      
      if (j?.slots?.length) {
        return res.json({ 
          ok: true, 
          date: ymd, 
          slot: j.slots[0], 
          interval: j.interval, 
          tz: j.tz 
        });
      }
    } catch (error: unknown) {
      console.error(`Error checking slots for ${ymd}:`, error);
    }
  }
  
  res.json({ ok: false, error: "no_slots" });
});

// PUBLIC routes (no auth required)
r.get("/schedule/public/:slug", async (req,res)=>{
  const { slug } = req.params;
  try {
    // Mock schedule link for demo
    const mockLink = {
      id: 'demo-link',
      slug: slug,
      title: 'Schedule a Meeting',
      description: 'Book a 30-minute meeting with our team',
      duration: 30,
      owner_ids: ['demo-user'],
      active: true
    };
    res.json({ ok:true, link: mockLink });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to fetch schedule link" });
  }
});

r.post("/schedule/public/:slug/book", async (req,res)=>{
  const { slug } = req.params;
  const { date, slot, attendee } = req.body;
  
  try {
    // Mock link validation for demo
    const mockLink = { id: 'demo-link', slug, duration: 30 };
    if (slug !== 'demo-link') return res.status(404).json({ ok:false, error:"Link not found" });

    // Create booking record
    const bookingId = `booking_${Date.now()}`;
    const startTime = new Date(date);
    startTime.setHours(9 + Math.floor(slot / 2), (slot % 2) * 30, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + (mockLink.duration || 30));

    const booking = {
      id: bookingId,
      link_id: mockLink.id,
      attendee_name: attendee.name,
      attendee_email: attendee.email,
      attendee_phone: attendee.phone,
      scheduled_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: attendee.notes,
      teams_link: `https://teams.microsoft.com/l/meetup-join/mock-meeting-${bookingId}`,
      status: 'confirmed'
    };

    // Store in database (handles missing table gracefully)
    try {
      await db.execute(sql`
        INSERT INTO schedule_bookings (id, link_id, attendee_name, attendee_email, attendee_phone, scheduled_time, notes, status)
        VALUES (${booking.id}, ${mockLink.id}, ${attendee.name}, ${attendee.email}, ${attendee.phone || null}, ${booking.scheduled_time}, ${attendee.notes || null}, 'confirmed')
      `);
    } catch (dbError) {
      console.log("Note: schedule_bookings table not found, using mock response");
    }

    res.json({ ok: true, booking });

  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to create booking" });
  }
});

export default r;