import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db';
import { contacts } from '../../shared/schema';
import { eq, inArray, sql } from 'drizzle-orm';
const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 30 });
// /api/contacts/duplicates?by=email|phone|both
router.get('/duplicates', limiter, async (req, res) => {
    try {
        const by = (String(req.query.by || 'email')).toLowerCase();
        // Get all contacts from the database - use actual column names from the contacts table
        const all = await db.execute(sql `
      SELECT id, email, phone, full_name as fullName, status, updatedAt as updatedAt
      FROM contacts
    `);
        const groups = new Map();
        const push = (key, c) => {
            if (!key)
                return;
            if (!groups.has(key))
                groups.set(key, []);
            groups.get(key).push(c);
        };
        for (const c of all.rows || all) {
            if (by === 'email' || by === 'both')
                push((c.email || '').trim().toLowerCase(), c);
            if (by === 'phone' || by === 'both')
                push((c.phone || '').replace(/\D/g, ''), c);
        }
        // keep only keys with >1 contacts
        const dupeSets = Array.from(groups.entries())
            .filter(([k, v]) => k && v.length > 1)
            .map(([key, list]) => ({
            key,
            count: list.length,
            ids: list.map(x => x.id),
            preview: list.map(x => ({
                id: x.id, email: x.email, phone: x.phone,
                name: x.fullName || '',
                status: x.status, updatedAt: x.updatedAt
            }))
        }))
            .sort((a, b) => b.count - a.count);
        res.json({ ok: true, items: dupeSets, by });
    }
    catch (error) {
        console.error('Error scanning duplicates:', error);
        res.status(500).json({ ok: false, error: 'Failed to scan duplicates' });
    }
});
// Merge: choose a survivor and a list of losers; optionally field picks
// POST /api/contacts/merge
// { survivorId: string, mergeIds: string[], picks?: Record<string, any>, dryRun?: boolean, note?: string }
router.post('/merge', limiter, async (req, res) => {
    try {
        const { survivorId, mergeIds = [], picks = {}, dryRun = false, note } = req.body || {};
        if (!survivorId || !mergeIds.length)
            return res.status(400).json({ ok: false, reason: 'missing_params' });
        const ids = Array.from(new Set([survivorId, ...mergeIds]));
        const idList = ids.map(id => `'${id}'`).join(', ');
        const rows = await db.execute(sql `
      SELECT id, email, phone, full_name as fullName, status, updatedAt as updatedAt
      FROM contacts
      WHERE id IN (${sql.raw(idList)})
    `);
        const rowsData = rows.rows || rows;
        if (rowsData.length !== ids.length)
            return res.status(404).json({ ok: false, reason: 'not_found' });
        const survivor = rowsData.find(r => r.id === survivorId);
        const losers = rowsData.filter(r => r.id !== survivorId);
        // Email is the constant — enforce survivor has the canonical email if any mismatch
        const candidateEmails = rowsData.map(r => ({ id: r.id, email: (r.email || '').trim().toLowerCase(), updatedAt: r.updatedAt || '' }))
            .filter(x => x.email);
        const emailFromPicks = (picks.email || '').trim().toLowerCase();
        let canonicalEmail = emailFromPicks || survivor.email || '';
        if (!canonicalEmail && candidateEmails.length) {
            candidateEmails.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
            canonicalEmail = candidateEmails[0].email;
        }
        const update = {
            fullName: picks.fullName ?? survivor.fullName ?? null,
            phone: picks.phone ?? survivor.phone ?? null,
            status: picks.status ?? survivor.status ?? null,
            email: canonicalEmail || null,
        };
        if (dryRun) {
            return res.json({
                ok: true, dryRun: true,
                survivorId, mergeIds,
                willUpdate: update,
                willDelete: losers.map(l => l.id)
            });
        }
        // Update survivor with merged data
        await db.update(contacts).set(update).where(eq(contacts.id, survivorId));
        // Delete loser contacts
        await db.delete(contacts).where(inArray(contacts.id, losers.map(l => l.id)));
        // Add audit note (simplified - just log for now)
        const noteText = note || `Merged contacts ${losers.map(l => l.id).join(', ')} into ${survivorId}.`;
        console.log(`[CONTACT-MERGE] ${noteText}`);
        res.json({ ok: true, survivorId, deleted: losers.map(l => l.id), updated: update });
    }
    catch (error) {
        console.error('Error merging contacts:', error);
        res.status(500).json({ ok: false, error: 'Failed to merge contacts' });
    }
});
export default router;
