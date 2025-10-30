/**
 * AI Credit Summary Service
 * Generates, manages, and learns from credit summaries
 */

import { OpenAI } from 'openai';
import { db } from '../db';
import { applications, contacts, documents } from '../../shared/schema';
import { creditSummaries, creditSummaryTraining, creditSummaryTemplates } from '../../shared/ai-summary-schema';
import { eq, and, desc } from 'drizzle-orm';
import { uploadDocumentToAzure } from '../utils/s3Upload';
import * as diff from 'diff';

// Initialize OpenAI if API key is available
let openaiClient: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('🧠 OpenAI client initialized for AI Credit Summaries');
} else {
  console.warn('⚠️ OpenAI API key not found - AI features will be disabled');
}

export interface CreditSummaryData {
  applicationId: string;
  businessName?: string;
  requestedAmount?: string;
  useOfFunds?: string;
  industry?: string;
  revenueRange?: string;
  yearsInBusiness?: number;
  contactName?: string;
  contactEmail?: string;
  businessWebsite?: string;
  ocrData?: any[];
  documentCount?: number;
}

/**
 * Generate AI credit summary for an application
 */
export async function generateAICreditSummary(
  applicationId: string,
  templateId?: string
): Promise<{
  success: boolean;
  summaryId?: string;
  content?: string;
  error?: string;
}> {
  console.log(`🧠 [AI-SUMMARY] Generating credit summary for application: ${applicationId}`);

  try {
    if (!openaiClient) {
      throw new Error('OpenAI client not configured');
    }

    // Fetch application data with all related information
    const appData = await fetchApplicationData(applicationId);
    
    if (!appData) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Get template (use default if not specified)
    const template = await getTemplate(templateId);
    
    // Generate AI summary
    const summaryContent = await generateSummaryWithAI(appData, template);
    
    // Save to database
    const [summary] = await db.insert(creditSummaries).values({
      applicationId,
      originalSummary: summaryContent,
      finalSummary: summaryContent, // Initially same as original
      templateUsed: template.name,
      aiModel: 'gpt-4',
      status: 'draft',
      isDraft: true,
      wordCount: summaryContent.split(/\s+/).length,
      characterCount: summaryContent.length,
      sections: extractSections(summaryContent),
      createdBy: null // TODO: Get from request context
    }).returning({ id: creditSummaries.id });

    console.log(`✅ [AI-SUMMARY] Generated summary with ID: ${summary.id}`);

    return {
      success: true,
      summaryId: summary.id,
      content: summaryContent
    };

  } catch (error) {
    console.error(`❌ [AI-SUMMARY] Generation failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Save draft changes to credit summary
 */
export async function saveDraftSummary(
  summaryId: string,
  content: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(creditSummaries)
      .set({
        finalSummary: content,
        wordCount: content.split(/\s+/).length,
        characterCount: content.length,
        sections: extractSections(content),
        editedBy: userId || null,
        updatedAt: new Date()
      })
      .where(eq(creditSummaries.id, summaryId));

    console.log(`✅ [AI-SUMMARY] Draft saved for summary: ${summaryId}`);
    return { success: true };

  } catch (error) {
    console.error(`❌ [AI-SUMMARY] Failed to save draft:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Submit final summary and generate PDF
 */
export async function submitFinalSummary(
  summaryId: string,
  finalContent: string,
  userId?: string
): Promise<{
  success: boolean;
  pdfUrl?: string;
  documentId?: string;
  error?: string;
}> {
  console.log(`📄 [AI-SUMMARY] Submitting final summary: ${summaryId}`);

  try {
    // Get original summary for training data
    const [existingSummary] = await db
      .select()
      .from(creditSummaries)
      .where(eq(creditSummaries.id, summaryId));

    if (!existingSummary) {
      throw new Error(`Summary not found: ${summaryId}`);
    }

    // Generate PDF from final content
    const pdfBuffer = await generatePDFFromSummary(finalContent, existingSummary);
    
    // Upload PDF to Azure
    const filename = `CreditSummary-${existingSummary.applicationId}.pdf`;
    const s3Result = await uploadDocumentToAzure({
      buffer: pdfBuffer,
      originalName: filename,
      mimeType: 'application/pdf'
    });

    // Update summary record
    await db.update(creditSummaries)
      .set({
        finalSummary: finalContent,
        status: 'final',
        isDraft: false,
        isLocked: true,
        pdfExported: true,
        pdfAzureKey: s3Result.key,
        pdfAzureBucket: s3Result.bucket,
        pdfFilename: filename,
        lockedBy: userId || null,
        lockedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(creditSummaries.id, summaryId));

    // Save document record
    const [document] = await db.insert(documents).values({
      applicationId: existingSummary.applicationId,
      originalFilename: filename,
      s3Key: s3Result.key,
      s3Bucket: s3Result.bucket,
      documentType: 'credit_summary',
      status: 'accepted',
      fileSize: pdfBuffer.length,
      mimeType: 'application/pdf',
      uploadedAt: new Date(),
      metadata: {
        generated: true,
        summaryId: summaryId,
        aiGenerated: true
      }
    }).returning({ id: documents.id });

    // Record training data if content was edited
    if (existingSummary.originalSummary !== finalContent) {
      await recordTrainingData(
        existingSummary.applicationId,
        summaryId,
        existingSummary.originalSummary || '',
        finalContent,
        userId
      );
    }

    console.log(`✅ [AI-SUMMARY] Final summary submitted with PDF: ${document.id}`);

    return {
      success: true,
      documentId: document.id,
      pdfUrl: `${process.env.REPLIT_DEV_DOMAIN}/api/documents/${document.id}/download`
    };

  } catch (error) {
    console.error(`❌ [AI-SUMMARY] Failed to submit final summary:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch comprehensive application data for AI processing
 */
async function fetchApplicationData(applicationId: string): Promise<CreditSummaryData | null> {
  try {
    // Get application with contact info
    const [appResult] = await db
      .select({
        id: applications.id,
        businessName: applications.businessName,
        requestedAmount: applications.requestedAmount,
        useOfFunds: applications.useOfFunds,
        industry: applications.industry,
        revenueRange: applications.revenueRange,
        yearsInBusiness: applications.yearsInBusiness,
        businessWebsite: applications.businessWebsite,
        contactName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email
      })
      .from(applications)
      .leftJoin(contacts, eq(applications.contactId, contacts.id))
      .where(eq(applications.id, applicationId));

    if (!appResult) return null;

    // Get document count
    const documentCount = await db
      .select({ count: documents.id })
      .from(documents)
      .where(eq(documents.applicationId, applicationId));

    return {
      applicationId,
      businessName: appResult.businessName || undefined,
      requestedAmount: appResult.requestedAmount || undefined,
      useOfFunds: appResult.useOfFunds || undefined,
      industry: appResult.industry || undefined,
      revenueRange: appResult.revenueRange || undefined,
      yearsInBusiness: appResult.yearsInBusiness || undefined,
      contactName: `${appResult.contactName || ''} ${appResult.contactLastName || ''}`.trim() || undefined,
      contactEmail: appResult.contactEmail || undefined,
      businessWebsite: appResult.businessWebsite || undefined,
      documentCount: documentCount.length
    };

  } catch (error) {
    console.error(`❌ [AI-SUMMARY] Failed to fetch application data:`, error);
    return null;
  }
}

/**
 * Get template for AI generation
 */
async function getTemplate(templateId?: string): Promise<any> {
  try {
    let template;
    
    if (templateId) {
      [template] = await db
        .select()
        .from(creditSummaryTemplates)
        .where(eq(creditSummaryTemplates.id, templateId));
    }
    
    if (!template) {
      // Get default template
      [template] = await db
        .select()
        .from(creditSummaryTemplates)
        .where(eq(creditSummaryTemplates.isDefault, true));
    }
    
    // Fallback to basic template if none exists
    if (!template) {
      return {
        name: 'Default Credit Summary Template',
        sections: {
          executive_summary: 'Executive Summary',
          business_overview: 'Business Overview',
          financial_analysis: 'Financial Analysis',
          risk_assessment: 'Risk Assessment',
          recommendation: 'Recommendation'
        },
        prompts: {
          system: 'You are a senior credit analyst writing a comprehensive credit summary for a business loan application.'
        }
      };
    }
    
    return template;

  } catch (error) {
    console.error(`❌ [AI-SUMMARY] Failed to get template:`, error);
    throw error;
  }
}

/**
 * Generate summary content using OpenAI
 */
async function generateSummaryWithAI(
  appData: CreditSummaryData,
  template: any
): Promise<string> {
  if (!openaiClient) {
    throw new Error('OpenAI client not available');
  }

  const prompt = `
You are a senior credit analyst writing a comprehensive credit summary for a business loan application.

APPLICATION DETAILS:
- Business Name: ${appData.businessName || 'Not provided'}
- Requested Amount: ${appData.requestedAmount || 'Not specified'}
- Use of Funds: ${appData.useOfFunds || 'Not specified'}
- Industry: ${appData.industry || 'Not specified'}
- Revenue Range: ${appData.revenueRange || 'Not provided'}
- Years in Business: ${appData.yearsInBusiness || 'Not specified'}
- Contact: ${appData.contactName || 'Not provided'}
- Documents Submitted: ${appData.documentCount || 0}

TEMPLATE SECTIONS:
${Object.entries(template.sections || {}).map(([key, title]) => `- ${title}`).join('\n')}

Please write a professional, detailed credit summary following the template structure. Include:

1. **Executive Summary** - Key highlights and recommendation
2. **Business Overview** - Company background, industry analysis, and operations
3. **Financial Analysis** - Revenue assessment, cash flow considerations, and financial health
4. **Risk Assessment** - Potential risks and mitigation factors
5. **Recommendation** - Final lending recommendation with reasoning

Write in a professional, analytical tone suitable for senior leadership review. Focus on factual analysis and clear recommendations.
`;

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: template.prompts?.system || 'You are a senior credit analyst writing comprehensive credit summaries.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content generated by AI');
    }

    return content;

  } catch (error) {
    console.error(`❌ [AI-SUMMARY] OpenAI generation failed:`, error);
    throw error;
  }
}

/**
 * Extract sections from summary content
 */
function extractSections(content: string): any {
  const sections: any = {};
  const lines = content.split('\n');
  let currentSection = '';
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Check if line is a section header (starts with #, **, or number.)
    if (trimmed.match(/^(#+\s|^\*\*|\d+\.\s)/)) {
      currentSection = trimmed.replace(/^(#+\s|^\*\*|\d+\.\s)/, '').replace(/\*\*$/, '');
      sections[currentSection] = '';
    } else if (currentSection && trimmed) {
      sections[currentSection] += (sections[currentSection] ? '\n' : '') + trimmed;
    }
  });
  
  return sections;
}

/**
 * Record training data for AI improvement
 */
async function recordTrainingData(
  applicationId: string,
  summaryId: string,
  originalSummary: string,
  finalSummary: string,
  userId?: string
): Promise<void> {
  try {
    // Calculate diff
    const delta = diff.diffChars(originalSummary, finalSummary);
    
    // Analyze edit intensity
    const editIntensity = calculateEditIntensity(originalSummary, finalSummary);
    
    await db.insert(creditSummaryTraining).values({
      applicationId,
      creditSummaryId: summaryId,
      originalSummary,
      finalEditedSummary: finalSummary,
      delta: delta,
      editIntensity,
      editedBy: userId || null
    });

    console.log(`✅ [AI-TRAINING] Training data recorded for summary: ${summaryId}`);

  } catch (error) {
    console.error(`❌ [AI-TRAINING] Failed to record training data:`, error);
  }
}

/**
 * Calculate edit intensity based on changes
 */
function calculateEditIntensity(original: string, final: string): 'minor' | 'moderate' | 'major' {
  const originalLength = original.length;
  const similarity = calculateSimilarity(original, final);
  
  if (similarity > 0.9) return 'minor';
  if (similarity > 0.7) return 'moderate';
  return 'major';
}

/**
 * Calculate text similarity (simple implementation)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const longer = text1.length > text2.length ? text1 : text2;
  const shorter = text1.length > text2.length ? text2 : text1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Generate PDF from summary content
 */
async function generatePDFFromSummary(content: string, summary: any): Promise<Buffer> {
  // Import puppeteer for PDF generation
  const puppeteer = await import('puppeteer');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .header { text-align: center; margin-bottom: 30px; }
        .footer { position: fixed; bottom: 30px; left: 40px; font-size: 10px; color: #7f8c8d; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Credit Summary</h1>
        <p>Application ID: ${summary.applicationId}</p>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="content">
        ${content.replace(/\n/g, '<br>')}
      </div>
      
      <div class="footer">
        Boreal Financial - Confidential
      </div>
    </body>
    </html>
  `;

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
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    return Buffer.from(pdf);
    
  } finally {
    await browser.close();
  }
}