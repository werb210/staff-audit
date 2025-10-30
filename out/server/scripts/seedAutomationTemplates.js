import { pool } from "../db/pool";
const q = pool.query.bind(pool);
async function main() {
    await q(`
    INSERT INTO comm_templates(name, channel, body, subject, engine, kind, description)
    VALUES
    ('Applicant Missing Docs Nudge', 'sms',
     'Hi {{ FirstName }}, we still need:\n{% for d in MissingDocs %}- {{ d.Category }}{% endfor %}\nUpload here: {{ ClientPortalUrl }}',
     NULL, 'liquid', 'automation', 'Nudge applicant to upload outstanding documents.')
    ON CONFLICT DO NOTHING
  `);
    await q(`
    INSERT INTO comm_templates(name, channel, body, subject, engine, kind, description)
    VALUES
    ('Lender Decision Nudge', 'email',
     '<p>Friendly reminder to review your assigned deals. Pending decisions older than 48h.</p>',
     'Pending decisions need attention', 'liquid', 'automation', 'Nudge lender org to finalize decisions.')
    ON CONFLICT DO NOTHING
  `);
    console.log("Seeded automation templates");
}
main().catch(e => { console.error(e); process.exit(1); });
