import { Router } from 'express';
import { q, lastDbError } from '../lib/db';
const r = Router();
r.get('/_int/pipeline-diagnose', async (_req, res) => {
    const info = await q(`
    select column_name, data_type
    from information_schema.columns
    where table_schema='public' and table_name='applications'
    order by ordinal_position
  `);
    const exists = !!info && info.rowCount > 0;
    const tryCounts = await q(`
    select lower(coalesce(a.status::text, a.stage::text, 'new')) as k,
           count(*)::int as n
    from applications a
    group by 1
    order by 2 desc
    limit 50
  `);
    const sample = await q(`
    select a.id::text,
           coalesce(b.name, a.business_name, a.company, a.applicant_name, 'Application '||left(a.id::text,8)) as business,
           coalesce(a.requested_amount, a.amount, a.loan_amount, 0)::numeric as amount,
           coalesce(a.status, a.stage, 'new')::text as status
    from applications a
    left join businesses b on b.id = a.businessId
    order by a.createdAt desc nulls last, a.id desc
    limit 10
  `);
    res.setHeader('X-Diag', 'pipeline');
    res.json({
        applications_table_exists: exists,
        applications_columns: info?.rows || [],
        status_counts: tryCounts?.rows || [],
        sample: sample?.rows || [],
        last_error: lastDbError() || undefined
    });
});
export default r;
