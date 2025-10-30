import { Router } from "express";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly";
const r = Router();
r.use(requireAuth);
r.get("/marketing/reports/pdf", async (req, res) => {
    try {
        // Gather marketing data
        const { rows: sequences } = await db.execute(sql `select count(*) as count from marketing_sequences`);
        const { rows: enrollments } = await db.execute(sql `select count(*) as count from marketing_enrollments where status = 'active'`);
        const { rows: audiences } = await db.execute(sql `select count(*) as count from audiences`);
        const { rows: experiments } = await db.execute(sql `select count(*) as count from experiments`);
        const { rows: clicks } = await db.execute(sql `select sum(clicks) as total from short_links`);
        // Create PDF
        const doc = await PDFDocument.create();
        const page = doc.addPage([612, 792]); // Letter size
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
        let y = 720;
        // Title
        page.drawText('Marketing Dashboard Report', {
            x: 50,
            y,
            size: 24,
            font: boldFont,
            color: rgb(0.2, 0.2, 0.2)
        });
        y -= 40;
        page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
            x: 50,
            y,
            size: 12,
            font,
            color: rgb(0.5, 0.5, 0.5)
        });
        y -= 60;
        // Metrics
        const metrics = [
            { label: 'Active Sequences', value: sequences[0]?.count || '0' },
            { label: 'Active Enrollments', value: enrollments[0]?.count || '0' },
            { label: 'Audiences', value: audiences[0]?.count || '0' },
            { label: 'A/B Experiments', value: experiments[0]?.count || '0' },
            { label: 'Total Link Clicks', value: clicks[0]?.total || '0' }
        ];
        for (const metric of metrics) {
            page.drawText(metric.label + ':', {
                x: 50,
                y,
                size: 14,
                font: boldFont,
                color: rgb(0.2, 0.2, 0.2)
            });
            page.drawText(String(metric.value), {
                x: 250,
                y,
                size: 14,
                font,
                color: rgb(0, 0.5, 0)
            });
            y -= 30;
        }
        // Recent activity section
        y -= 20;
        page.drawText('Recent Activity', {
            x: 50,
            y,
            size: 16,
            font: boldFont,
            color: rgb(0.2, 0.2, 0.2)
        });
        y -= 30;
        const { rows: recentEnrollments } = await db.execute(sql `
      select e.status, s.name as sequence_name, c.full_name as contact_name, e.createdAt
      from marketing_enrollments e
      left join marketing_sequences s on e.sequence_id = s.id
      left join contacts c on e.contact_id = c.id
      order by e.createdAt desc
      limit 10
    `);
        for (const enrollment of recentEnrollments) {
            const text = `${enrollment.contact_name || 'Unknown'} → ${enrollment.sequence_name || 'Unknown'} (${enrollment.status})`;
            page.drawText(text, {
                x: 50,
                y,
                size: 10,
                font,
                color: rgb(0.3, 0.3, 0.3)
            });
            y -= 20;
        }
        const pdfBytes = await doc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=marketing-report.pdf');
        res.send(Buffer.from(pdfBytes));
    }
    catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
});
export default r;
