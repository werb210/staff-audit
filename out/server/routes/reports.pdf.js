import { Router } from "express";
import puppeteer from "puppeteer";
import { requireAuth } from "../auth/verifyOnly.js";
const r = Router();
r.use(requireAuth);
// Generate PDF report from HTML template
async function generatePDF(htmlContent, filename) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '10mm',
                bottom: '20mm',
                left: '10mm'
            }
        });
        return pdf;
    }
    finally {
        await browser.close();
    }
}
// Conversion Dashboard PDF
r.get("/reports/conversion/pdf", async (req, res) => {
    const { dateRange = "30d" } = req.query;
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Conversion Dashboard Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .metric { display: inline-block; margin: 10px 20px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        .metric-label { font-size: 12px; color: #666; }
        .section { margin: 20px 0; }
        .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Conversion Dashboard Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()} • Period: ${dateRange}</p>
      </div>
      
      <div class="section">
        <h2>Key Metrics</h2>
        <div class="metric">
          <div class="metric-value">4.2%</div>
          <div class="metric-label">Conversion Rate</div>
        </div>
        <div class="metric">
          <div class="metric-value">1,247</div>
          <div class="metric-label">Total Leads</div>
        </div>
        <div class="metric">
          <div class="metric-value">52</div>
          <div class="metric-label">Conversions</div>
        </div>
        <div class="metric">
          <div class="metric-value">$127K</div>
          <div class="metric-label">Revenue</div>
        </div>
      </div>
      
      <div class="section">
        <h2>Conversion Funnel</h2>
        <table>
          <tr><th>Stage</th><th>Count</th><th>Drop-off</th></tr>
          <tr><td>Visitors</td><td>2,891</td><td>-</td></tr>
          <tr><td>Leads</td><td>1,247</td><td>56.9%</td></tr>
          <tr><td>Qualified</td><td>234</td><td>81.2%</td></tr>
          <tr><td>Converted</td><td>52</td><td>77.8%</td></tr>
        </table>
      </div>
      
      <div class="footer">
        <p>This report was generated automatically from your CRM data.</p>
      </div>
    </body>
    </html>
  `;
    try {
        const pdf = await generatePDF(htmlContent, 'conversion-report.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="conversion-report.pdf"');
        res.send(pdf);
    }
    catch (error) {
        res.status(500).json({ ok: false, error: "PDF generation failed" });
    }
});
// Document Status Report PDF
r.get("/reports/documents/pdf", async (req, res) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Document Status Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .chart-placeholder { background: #f3f4f6; border: 2px dashed #d1d5db; height: 200px; margin: 20px 0; display: flex; align-items: center; justify-content: center; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .status-pending { background-color: #fef3c7; }
        .status-approved { background-color: #d1fae5; }
        .status-rejected { background-color: #fee2e2; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Document Status Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="chart-placeholder">
        Document Status Distribution Chart
      </div>
      
      <table>
        <tr><th>Application ID</th><th>Document Type</th><th>Status</th><th>Uploaded</th></tr>
        <tr><td>APP-001</td><td>Bank Statement</td><td class="status-approved">Approved</td><td>2025-08-15</td></tr>
        <tr><td>APP-001</td><td>ID Document</td><td class="status-pending">Pending</td><td>2025-08-16</td></tr>
        <tr><td>APP-002</td><td>Pay Stub</td><td class="status-rejected">Rejected</td><td>2025-08-14</td></tr>
        <tr><td>APP-003</td><td>Bank Statement</td><td class="status-approved">Approved</td><td>2025-08-17</td></tr>
      </table>
    </body>
    </html>
  `;
    try {
        const pdf = await generatePDF(htmlContent, 'document-status-report.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="document-status-report.pdf"');
        res.send(pdf);
    }
    catch (error) {
        res.status(500).json({ ok: false, error: "PDF generation failed" });
    }
});
// Activity Dashboard PDF
r.get("/reports/activity/pdf", async (req, res) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Activity Dashboard Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .activity-item { border-left: 4px solid #3b82f6; padding: 10px; margin: 10px 0; background: #f8fafc; }
        .timestamp { font-size: 12px; color: #666; }
        .user { font-weight: bold; color: #1f2937; }
        .action { color: #374151; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Activity Dashboard Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="activity-item">
        <div class="timestamp">2025-08-18 14:30</div>
        <div class="user">Sarah Johnson</div>
        <div class="action">Updated application APP-001 status to "In Review"</div>
      </div>
      
      <div class="activity-item">
        <div class="timestamp">2025-08-18 14:15</div>
        <div class="user">Mike Chen</div>
        <div class="action">Uploaded bank statement for APP-002</div>
      </div>
      
      <div class="activity-item">
        <div class="timestamp">2025-08-18 13:45</div>
        <div class="user">Todd Anderson</div>
        <div class="action">Approved document submission for APP-003</div>
      </div>
    </body>
    </html>
  `;
    try {
        const pdf = await generatePDF(htmlContent, 'activity-report.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="activity-report.pdf"');
        res.send(pdf);
    }
    catch (error) {
        res.status(500).json({ ok: false, error: "PDF generation failed" });
    }
});
export default r;
