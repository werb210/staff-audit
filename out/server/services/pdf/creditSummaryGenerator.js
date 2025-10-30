import OpenAI from "openai";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from '../../db';
import { applications, documents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export class CreditSummaryGenerator {
    // Generate AI-powered credit summary text
    async generateAISummary(application, applicationDocs) {
        try {
            const documentSummary = applicationDocs.map(doc => `- ${doc.documentType}: ${doc.status || 'uploaded'}`).join('\n');
            const prompt = `Generate a professional credit summary for this business loan application:

Business Information:
- Legal Business Name: ${application.legalBusinessName || 'Not provided'}
- Amount Requested: $${(application.amountRequested || 0).toLocaleString()}
- Use of Funds: ${application.useOfFunds || 'Not specified'}
- Business Type: ${application.businessType || 'Not specified'}
- Monthly Revenue: $${(application.monthlyRevenue || 0).toLocaleString()}
- Time in Business: ${application.timeInBusiness || 'Not provided'}

Documents Submitted:
${documentSummary || 'No documents listed'}

Please provide a comprehensive credit summary including:
1. Business Overview
2. Financial Profile  
3. Risk Assessment
4. Recommendation

Format as professional text suitable for a PDF report. Be concise but thorough.`;
            const response = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system",
                        content: "You are a financial analyst specializing in business credit evaluation. Provide professional, objective assessments."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.3
            });
            return response.choices[0].message.content || "Unable to generate credit summary at this time.";
        }
        catch (error) {
            console.error('[CREDIT-SUMMARY] Error generating AI summary:', error);
            return this.generateFallbackSummary(application);
        }
    }
    // Generate fallback summary without AI
    generateFallbackSummary(application) {
        const amount = (application.amountRequested || 0).toLocaleString();
        const revenue = (application.monthlyRevenue || 0).toLocaleString();
        return `
CREDIT SUMMARY REPORT

Business Overview:
${application.legalBusinessName || 'Business Name Not Provided'} has submitted an application for business financing in the amount of $${amount}. The requested funds will be used for ${application.useOfFunds || 'general business purposes'}.

Financial Profile:
- Requested Amount: $${amount}
- Reported Monthly Revenue: $${revenue}
- Business Type: ${application.businessType || 'Not specified'}
- Time in Business: ${application.timeInBusiness || 'Not provided'}

Assessment:
This application requires further review to determine creditworthiness and loan eligibility. Additional documentation or verification may be required to complete the evaluation process.

Recommendation:
Pending complete documentation review and financial verification.
`;
    }
    // Generate PDF credit summary
    async generateCreditSummaryPDF(applicationId) {
        try {
            // Fetch application data
            const app = await db
                .select()
                .from(applications)
                .where(eq(applications.id, applicationId))
                .limit(1);
            if (app.length === 0) {
                throw new Error('Application not found');
            }
            const application = app[0];
            // Fetch application documents
            const docs = await db
                .select()
                .from(documents)
                .where(eq(documents.applicationId, applicationId));
            // Generate AI summary
            const aiSummary = await this.generateAISummary(application, docs);
            // Create PDF
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([612, 792]); // Letter size
            const { width, height } = page.getSize();
            // Load fonts
            const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            let currentY = height - 60;
            // Header
            page.drawText('BUSINESS CREDIT SUMMARY', {
                x: 50,
                y: currentY,
                size: 20,
                font: titleFont,
                color: rgb(0.1, 0.1, 0.4)
            });
            currentY -= 30;
            // Application details header
            page.drawText(`Application #${applicationId.slice(0, 8)}`, {
                x: 50,
                y: currentY,
                size: 12,
                font: bodyFont,
                color: rgb(0.4, 0.4, 0.4)
            });
            page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
                x: width - 200,
                y: currentY,
                size: 12,
                font: bodyFont,
                color: rgb(0.4, 0.4, 0.4)
            });
            currentY -= 40;
            // Business Information Section
            page.drawText('BUSINESS INFORMATION', {
                x: 50,
                y: currentY,
                size: 14,
                font: boldFont,
                color: rgb(0.2, 0.2, 0.2)
            });
            currentY -= 25;
            const businessInfo = [
                `Business Name: ${application.legalBusinessName || 'Not provided'}`,
                `Amount Requested: $${(application.amountRequested || 0).toLocaleString()}`,
                `Use of Funds: ${application.useOfFunds || 'Not specified'}`,
                `Application Date: ${application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'Unknown'}`
            ];
            for (const info of businessInfo) {
                page.drawText(info, {
                    x: 60,
                    y: currentY,
                    size: 10,
                    font: bodyFont,
                    color: rgb(0.2, 0.2, 0.2)
                });
                currentY -= 18;
            }
            currentY -= 20;
            // AI Summary Section
            page.drawText('CREDIT ANALYSIS', {
                x: 50,
                y: currentY,
                size: 14,
                font: boldFont,
                color: rgb(0.2, 0.2, 0.2)
            });
            currentY -= 25;
            // Split AI summary into lines that fit
            const maxWidth = width - 120;
            const lines = this.wrapText(aiSummary, bodyFont, 10, maxWidth);
            for (const line of lines) {
                if (currentY < 80) {
                    // Add new page if needed
                    const newPage = pdfDoc.addPage([612, 792]);
                    currentY = height - 60;
                    newPage.drawText(line, {
                        x: 60,
                        y: currentY,
                        size: 10,
                        font: bodyFont,
                        color: rgb(0.2, 0.2, 0.2)
                    });
                }
                else {
                    page.drawText(line, {
                        x: 60,
                        y: currentY,
                        size: 10,
                        font: bodyFont,
                        color: rgb(0.2, 0.2, 0.2)
                    });
                }
                currentY -= 14;
            }
            // Footer
            const pages = pdfDoc.getPages();
            pages.forEach((pg, index) => {
                pg.drawText(`Page ${index + 1} of ${pages.length}`, {
                    x: width - 100,
                    y: 30,
                    size: 8,
                    font: bodyFont,
                    color: rgb(0.5, 0.5, 0.5)
                });
                pg.drawText('Confidential - For Internal Use Only', {
                    x: 50,
                    y: 30,
                    size: 8,
                    font: bodyFont,
                    color: rgb(0.5, 0.5, 0.5)
                });
            });
            const pdfBytes = await pdfDoc.save();
            return Buffer.from(pdfBytes);
        }
        catch (error) {
            console.error('[CREDIT-SUMMARY] Error generating PDF:', error);
            throw new Error(`Failed to generate credit summary PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Helper function to wrap text
    wrapText(text, font, fontSize, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            if (testWidth <= maxWidth) {
                currentLine = testLine;
            }
            else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                }
                else {
                    // Word is too long, break it
                    lines.push(word);
                    currentLine = '';
                }
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        return lines;
    }
    // Generate editable summary data for frontend
    async generateEditableSummary(applicationId) {
        try {
            // Fetch application data
            const app = await db
                .select()
                .from(applications)
                .where(eq(applications.id, applicationId))
                .limit(1);
            if (app.length === 0) {
                throw new Error('Application not found');
            }
            const application = app[0];
            // Fetch documents
            const docs = await db
                .select()
                .from(documents)
                .where(eq(documents.applicationId, applicationId));
            // Generate AI summary
            const aiSummary = await this.generateAISummary(application, docs);
            // Parse summary for structured data
            const riskFactors = await this.extractRiskFactors(application, docs);
            const recommendations = await this.generateRecommendations(application, docs);
            return {
                applicationData: {
                    id: application.id,
                    legalBusinessName: application.legalBusinessName,
                    amountRequested: application.amountRequested,
                    useOfFunds: application.useOfFunds,
                    businessType: application.businessType,
                    createdAt: application.createdAt
                },
                aiSummary,
                documentsSummary: docs.map(doc => ({
                    id: doc.id,
                    documentType: doc.documentType,
                    fileName: doc.fileName,
                    status: doc.status,
                    uploadedAt: doc.createdAt
                })),
                riskFactors,
                recommendations
            };
        }
        catch (error) {
            console.error('[CREDIT-SUMMARY] Error generating editable summary:', error);
            throw error;
        }
    }
    // Extract risk factors using AI
    async extractRiskFactors(application, docs) {
        try {
            const prompt = `Based on this loan application, identify key risk factors:
      
Business: ${application.legalBusinessName}
Amount: $${(application.amountRequested || 0).toLocaleString()}
Documents: ${docs.length} submitted

Return only a JSON array of risk factors as strings.`;
            const response = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                max_tokens: 500
            });
            const result = JSON.parse(response.choices[0].message.content || '{"risks": []}');
            return result.risks || result.riskFactors || [];
        }
        catch (error) {
            console.error('[CREDIT-SUMMARY] Error extracting risk factors:', error);
            return ['Unable to assess risk factors at this time'];
        }
    }
    // Generate recommendations using AI
    async generateRecommendations(application, docs) {
        try {
            const prompt = `Generate lending recommendations for this application:
      
Business: ${application.legalBusinessName}
Amount: $${(application.amountRequested || 0).toLocaleString()}
Use: ${application.useOfFunds}

Return only a JSON array of actionable recommendations.`;
            const response = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                max_tokens: 500
            });
            const result = JSON.parse(response.choices[0].message.content || '{"recommendations": []}');
            return result.recommendations || [];
        }
        catch (error) {
            console.error('[CREDIT-SUMMARY] Error generating recommendations:', error);
            return ['Complete document review required'];
        }
    }
}
export const creditSummaryGenerator = new CreditSummaryGenerator();
