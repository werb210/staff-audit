import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly";
const r = Router();
r.use(requireAuth);
r.get("/scheduling/settings", async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ error: "unauthorized" });
    const { rows } = await db.execute(sql `
    SELECT * FROM scheduling_settings WHERE user_id = ${userId}
  `);
    const defaults = {
        time_zone: 'America/Edmonton',
        slot_minutes: 30,
        buffer_before: 10,
        buffer_after: 10,
        workdays: [1, 2, 3, 4, 5],
        start_hour: 9,
        end_hour: 17
    };
    res.json({ ok: true, settings: rows[0] || defaults });
});
r.post("/scheduling/settings", async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ error: "unauthorized" });
    const { time_zone, slot_minutes, buffer_before, buffer_after, workdays, start_hour, end_hour } = req.body;
    await db.execute(sql `
    INSERT INTO scheduling_settings(user_id, time_zone, slot_minutes, buffer_before, buffer_after, workdays, start_hour, end_hour)
    VALUES(${userId}, ${time_zone}, ${slot_minutes}, ${buffer_before}, ${buffer_after}, ${workdays}, ${start_hour}, ${end_hour})
    ON CONFLICT(user_id) DO UPDATE SET
      time_zone = EXCLUDED.time_zone,
      slot_minutes = EXCLUDED.slot_minutes,
      buffer_before = EXCLUDED.buffer_before,
      buffer_after = EXCLUDED.buffer_after,
      workdays = EXCLUDED.workdays,
      start_hour = EXCLUDED.start_hour,
      end_hour = EXCLUDED.end_hour
  `);
    res.json({ ok: true });
});
r.get("/scheduling/availability", async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        return res.status(401).json({ error: "unauthorized" });
    const { date } = req.query;
    if (!date)
        return res.status(400).json({ error: "date required" });
    // Get user settings
    const { rows: settings } = await db.execute(sql `
    SELECT * FROM scheduling_settings WHERE user_id = ${userId}
  `);
    const config = settings[0] || { slot_minutes: 30, start_hour: 9, end_hour: 17, buffer_before: 10, buffer_after: 10 };
    // Get existing bookings for the date
    const { rows: bookings } = await db.execute(sql `
    SELECT start_time, end_time FROM bookings 
    WHERE user_id = ${userId} 
    AND DATE(start_time AT TIME ZONE 'UTC') = ${date}
    AND status = 'booked'
  `);
    // Generate available slots (simplified logic)
    const slots = [];
    const startHour = config.start_hour || 9;
    const endHour = config.end_hour || 17;
    const slotMinutes = config.slot_minutes || 30;
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotMinutes) {
            const slotStart = `${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            const slotEnd = new Date(new Date(slotStart).getTime() + slotMinutes * 60 * 1000).toISOString().slice(0, 19);
            // Check if slot conflicts with existing bookings
            const conflict = bookings.some(booking => {
                const bookingStart = new Date(booking.start_time).toISOString().slice(0, 19);
                const bookingEnd = new Date(booking.end_time).toISOString().slice(0, 19);
                return (slotStart < bookingEnd && slotEnd > bookingStart);
            });
            if (!conflict) {
                slots.push({ start: slotStart, end: slotEnd });
            }
        }
    }
    res.json({ ok: true, slots });
});
r.post("/scheduling/book", async (req, res) => {
    const { contact_email, contact_name, start_time, end_time, user_id } = req.body;
    if (!contact_email || !start_time || !end_time || !user_id) {
        return res.status(400).json({ error: "missing_fields" });
    }
    const { rows } = await db.execute(sql `
    INSERT INTO bookings(user_id, contact_email, contact_name, start_time, end_time)
    VALUES(${user_id}, ${contact_email}, ${contact_name}, ${start_time}, ${end_time})
    RETURNING id
  `);
    res.json({ ok: true, booking_id: rows[0]?.id });
});
export default r;
