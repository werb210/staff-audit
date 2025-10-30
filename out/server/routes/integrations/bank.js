import { Router } from "express";
// REMOVED: requirePermission from authz service (authentication system deleted)
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { enabled } from "../../services/integrations/core";
import * as mock from "../../services/integrations/adapters/bank.mock";
const router = Router();
function provider() { return String(process.env.BANK_PROVIDER || "mock").toLowerCase(); }
/* Step 1: create link token */
router.post("/link/token", async (req, res) => {
    if (!enabled())
        return res.status(501).json({ error: "integrations disabled" });
    const contactId = String(req.body?.contactId || "");
    if (!contactId)
        return res.status(400).json({ error: "contactId required" });
    switch (provider()) {
        case "mock": return res.json(await mock.createLinkToken({ contactId }));
        default: return res.status(501).json({ error: `provider ${provider()} not implemented` });
    }
});
/* Step 2: exchange public token -> access token + create link */
router.post("/link/exchange", async (req, res) => {
    const { contactId, public_token } = req.body || {};
    if (!contactId || !public_token)
        return res.status(400).json({ error: "contactId and public_token required" });
    switch (provider()) {
        case "mock": {
            const ex = await mock.exchangePublicToken({ public_token });
            const ins = await db.execute(sql `
        INSERT INTO bank_links(contact_id, provider, access_token, institution)
        VALUES (${contactId}, ${provider()}, ${ex.access_token}, 'Mock Credit Union')
        RETURNING id
      `);
            return res.json({ ok: true, link_id: ins.rows?.[0]?.id });
        }
        default: return res.status(501).json({ error: `provider ${provider()} not implemented` });
    }
});
/* Fetch balances + upsert accounts */
router.post("/sync/balances", async (req, res) => {
    const { link_id } = req.body || {};
    const link = (await db.execute(sql `SELECT * FROM bank_links WHERE id=${link_id} LIMIT 1`)).rows?.[0];
    if (!link)
        return res.status(404).json({ error: "link not found" });
    switch (provider()) {
        case "mock": {
            const out = await mock.fetchBalances({ access_token: link.access_token });
            await db.execute(sql `UPDATE bank_links SET institution=${out.institution}, last_sync_at=now() WHERE id=${link_id}`);
            for (const a of out.accounts || []) {
                await db.execute(sql `
          INSERT INTO bank_accounts(link_id, acct_id, name, mask, type, subtype, currency, available, current, updatedAt)
          VALUES (${link_id}, ${a.acct_id}, ${a.name}, ${a.mask}, ${a.type}, ${a.subtype}, ${a.currency}, ${a.available}, ${a.current}, now())
          ON CONFLICT (link_id, acct_id) DO UPDATE
          SET name=EXCLUDED.name, mask=EXCLUDED.mask, type=EXCLUDED.type, subtype=EXCLUDED.subtype, currency=EXCLUDED.currency, available=EXCLUDED.available, current=EXCLUDED.current, updatedAt=now()
        `);
            }
            return res.json({ ok: true, accounts: out.accounts?.length || 0 });
        }
        default: return res.status(501).json({ error: `provider ${provider()} not implemented` });
    }
});
/* Fetch transactions since date (YYYY-MM-DD) */
router.post("/sync/transactions", async (req, res) => {
    const { link_id, since } = req.body || {};
    const link = (await db.execute(sql `SELECT * FROM bank_links WHERE id=${link_id} LIMIT 1`)).rows?.[0];
    if (!link)
        return res.status(404).json({ error: "link not found" });
    switch (provider()) {
        case "mock": {
            const out = await mock.fetchTransactions({ access_token: link.access_token, since: since || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10) });
            for (const t of out.txns || []) {
                await db.execute(sql `
          INSERT INTO bank_transactions(link_id, acct_id, txn_id, posted_at, amount, name, category, raw)
          VALUES (${link_id}, ${t.acct_id}, ${t.txn_id}, ${t.posted_at}, ${t.amount}, ${t.name}, ${t.category}, ${t})
          ON CONFLICT (link_id, txn_id) DO NOTHING
        `);
            }
            return res.json({ ok: true, transactions: out.txns?.length || 0 });
        }
        default: return res.status(501).json({ error: `provider ${provider()} not implemented` });
    }
});
export default router;
