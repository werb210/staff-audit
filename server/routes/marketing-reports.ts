import express from 'express';

const router = express.Router();

/**
 * GET /api/reports/monthly/:date
 * Fetch monthly marketing report data
 */
router.get('/monthly/:date', async (req: any, res: any) => {
  console.log('📊 [REPORTS] Fetching monthly report for:', req.params.date);
  
  try {
    const { date } = req.params;
    
    // Validate date format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM' });
    }
    
    // Mock monthly report data
    const mockReportData = {
      month: date,
      totalSpend: 18542.67,
      totalConversions: 456,
      totalRevenue: 2845000,
      cpa: 40.66,
      roas: 15.3,
      campaigns: 8,
      emailStats: {
        sent: 15420,
        opened: 4830,
        clicked: 892,
        openRate: 31.3,
        clickRate: 18.5
      }
    };
    
    return res.json(mockReportData);
    
  } catch (error: unknown) {
    console.error('❌ [REPORTS] Error fetching monthly report:', error);
    res.status(500).json({ error: 'Failed to fetch monthly report' });
  }
});

/**
 * GET /api/reports/monthly/:date/pdf
 * Download monthly report as PDF
 */
router.get('/monthly/:date/pdf', async (req: any, res: any) => {
  console.log('📄 [REPORTS] Generating PDF for:', req.params.date);
  
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM' });
    }
    
    // In development, return a mock PDF response
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      // Create a simple mock PDF content
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Marketing Report - ${date}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000109 00000 n 
0000000158 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
251
%%EOF`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="marketing-report-${date}.pdf"`);
      return res.send(Buffer.from(pdfContent));
    }
    
    // In production, generate actual PDF using a library like PDFKit
    res.status(501).json({ error: 'PDF generation not implemented in production' });
    
  } catch (error: unknown) {
    console.error('❌ [REPORTS] Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

/**
 * GET /api/reports/monthly
 * Get list of available monthly reports
 */
router.get('/monthly', async (req: any, res: any) => {
  console.log('📊 [REPORTS] Fetching available monthly reports');
  
  try {
    // Mock list of available reports
    const availableReports = [
      { date: '2025-01', name: 'January 2025', hasData: true },
      { date: '2024-12', name: 'December 2024', hasData: true },
      { date: '2024-11', name: 'November 2024', hasData: true },
      { date: '2024-10', name: 'October 2024', hasData: true },
      { date: '2024-09', name: 'September 2024', hasData: true },
      { date: '2024-08', name: 'August 2024', hasData: true }
    ];
    
    return res.json(availableReports);
    
  } catch (error: unknown) {
    console.error('❌ [REPORTS] Error fetching report list:', error);
    res.status(500).json({ error: 'Failed to fetch report list' });
  }
});

export default router;