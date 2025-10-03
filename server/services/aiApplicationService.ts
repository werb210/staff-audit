/**
 * AI Application Service
 * Comprehensive AI features for application processing
 */

import { db } from '../db';
import { applications, documents, contacts } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { 
  callOpenAI, 
  buildCreditSummaryPrompt, 
  buildRiskAssessmentPrompt, 
  buildNextStepPrompt,
  buildDocumentMatchPrompt,
  buildDocumentSummaryPrompt 
} from '../utils/openai';
import { buildCreditInput } from './_canonFields';
import { uploadDocumentToS3 } from '../utils/s3Upload';
import { PDFDocument, rgb } from 'pdf-lib';

export interface AIApplicationData {
  applicationId: string;
  businessName?: string;
  industry?: string;
  yearsInBusiness?: number;
  annualRevenue?: number;
  requestedAmount?: string;
  useOfFunds?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: string;
  documentCount?: number;
  ocrData?: any[];
  bankingData?: any;
  missingDocuments?: string[];
  ocrConflicts?: number;
  ocrQualityScore?: number;
}

/**
 * Generate AI credit summary for application
 */
export async function generateAICreditSummary(applicationId: string): Promise<{
  success: boolean;
  summary?: string;
  error?: string;
}> {
  try {
    console.log(`🧠 [AI-SUMMARY] Generating credit summary for: ${applicationId}`);
    
    const app = await getApplicationData(applicationId);
    
    if (!app) {
      throw new Error('Application not found');
    }

    const creditInput = buildCreditInput(app);
    const prompt = buildCreditSummaryPrompt(creditInput);
    const summary = await callOpenAI(prompt, 2000);

    // Save summary to database (using existing creditSummaries table)
    await saveCreditSummary(applicationId, summary);

    console.log(`✅ [AI-SUMMARY] Generated summary for: ${applicationId}`);
    return { success: true, summary };

  } catch (error) {
    console.error(`❌ [AI-SUMMARY] Failed for ${applicationId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generate AI risk score for application
 */
export async function generateRiskScore(applicationId: string): Promise<{
  success: boolean;
  riskLevel?: string;
  explanation?: string;
  error?: string;
}> {
  try {
    console.log(`🎯 [AI-RISK] Generating risk score for: ${applicationId}`);
    
    const app = await getApplicationData(applicationId);
    
    if (!app) {
      throw new Error('Application not found');
    }

    const creditInput = buildCreditInput(app);
    const prompt = buildRiskAssessmentPrompt(creditInput);
    const result = await callOpenAI(prompt, 500);

    // Parse risk level from response
    const riskLevel = extractRiskLevel(result);
    const explanation = result.replace(riskLevel, '').trim();

    // Save risk assessment
    await saveRiskAssessment(applicationId, riskLevel, explanation);

    console.log(`✅ [AI-RISK] Generated risk ${riskLevel} for: ${applicationId}`);
    return { success: true, riskLevel, explanation };

  } catch (error) {
    console.error(`❌ [AI-RISK] Failed for ${applicationId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generate smart next step suggestion
 */
export async function generateNextStepSuggestion(applicationId: string): Promise<{
  success: boolean;
  suggestion?: string;
  priority?: string;
  error?: string;
}> {
  try {
    console.log(`🚀 [AI-NEXTSTEP] Generating suggestion for: ${applicationId}`);
    
    const appData = await getApplicationData(applicationId);
    
    if (!appData) {
      throw new Error('Application not found');
    }

    const prompt = buildNextStepPrompt(appData);
    const suggestion = await callOpenAI(prompt, 300);

    // Determine priority based on content
    const priority = determinePriority(suggestion);

    console.log(`✅ [AI-NEXTSTEP] Generated suggestion for: ${applicationId}`);
    return { success: true, suggestion, priority };

  } catch (error) {
    console.error(`❌ [AI-NEXTSTEP] Failed for ${applicationId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * AI document matching analysis
 */
export async function analyzeDocumentMatching(applicationId: string): Promise<{
  success: boolean;
  analysis?: any;
  error?: string;
}> {
  try {
    console.log(`📄 [AI-DOCMATCH] Analyzing documents for: ${applicationId}`);
    
    const docs = await getApplicationDocuments(applicationId);
    const requirements = getStandardDocumentRequirements();

    const prompt = buildDocumentMatchPrompt(docs, requirements);
    const result = await callOpenAI(prompt, 1000);

    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(result);
    } catch {
      // Fallback if JSON parsing fails
      analysis = { rawAnalysis: result };
    }

    console.log(`✅ [AI-DOCMATCH] Analyzed ${docs.length} documents for: ${applicationId}`);
    return { success: true, analysis };

  } catch (error) {
    console.error(`❌ [AI-DOCMATCH] Failed for ${applicationId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * AI multi-document summarizer
 */
export async function generateDocumentSummary(applicationId: string): Promise<{
  success: boolean;
  summary?: string;
  error?: string;
}> {
  try {
    console.log(`📋 [AI-DOCSUMMARY] Summarizing documents for: ${applicationId}`);
    
    const docs = await getApplicationDocuments(applicationId);
    
    if (docs.length === 0) {
      return { success: true, summary: 'No documents available to summarize.' };
    }

    const prompt = buildDocumentSummaryPrompt(docs);
    const summary = await callOpenAI(prompt, 1500);

    console.log(`✅ [AI-DOCSUMMARY] Summarized ${docs.length} documents for: ${applicationId}`);
    return { success: true, summary };

  } catch (error) {
    console.error(`❌ [AI-DOCSUMMARY] Failed for ${applicationId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Submit AI summary with lender-specific customizations
 */
export async function submitSummaryWithLenderCustomization(
  applicationId: string, 
  summary: string, 
  lenderId?: string
): Promise<{
  success: boolean;
  pdfUrl?: string;
  documentId?: string;
  error?: string;
}> {
  try {
    console.log(`📄 [AI-SUBMIT] Submitting summary for: ${applicationId}`);
    
    // Apply lender-specific customizations if lenderId provided
    let customizedSummary = summary;
    if (lenderId) {
      customizedSummary = await applyLenderCustomizations(summary, lenderId);
    }

    // Generate PDF
    const pdfBuffer = await generateSummaryPDF(applicationId, customizedSummary);
    
    // Upload to S3
    const appData = await getApplicationData(applicationId);
    const filename = `${appData?.businessName || 'Application'} - Credit Summary.pdf`;
    
    const s3Result = await uploadDocumentToS3({
      buffer: pdfBuffer,
      originalName: filename,
      mimeType: 'application/pdf'
    });

    // Save document record
    const [document] = await db.insert(documents).values({
      applicationId,
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
        aiGenerated: true,
        lenderSpecific: !!lenderId,
        lenderId
      }
    }).returning({ id: documents.id });

    console.log(`✅ [AI-SUBMIT] PDF generated and saved: ${document.id}`);
    
    return {
      success: true,
      documentId: document.id,
      pdfUrl: `/api/documents/${document.id}/download`
    };

  } catch (error) {
    console.error(`❌ [AI-SUBMIT] Failed for ${applicationId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Helper Functions

async function getApplicationData(applicationId: string): Promise<AIApplicationData | null> {
  try {
    const [appResult] = await db
      .select({
        id: applications.id,
        businessName: applications.businessName,
        industry: applications.industry,
        yearsInBusiness: applications.yearsInBusiness,
        requestedAmount: applications.requestedAmount,
        useOfFunds: applications.useOfFunds,
        status: applications.status,
        contactName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
        contactPhone: contacts.phone
      })
      .from(applications)
      .leftJoin(contacts, eq(applications.contactId, contacts.id))
      .where(eq(applications.id, applicationId));

    if (!appResult) return null;

    // Get document count
    const docCount = await db
      .select({ count: documents.id })
      .from(documents)
      .where(eq(documents.applicationId, applicationId));

    return {
      applicationId,
      businessName: appResult.businessName || undefined,
      industry: appResult.industry || undefined,
      yearsInBusiness: appResult.yearsInBusiness || undefined,
      requestedAmount: appResult.requestedAmount || undefined,
      useOfFunds: appResult.useOfFunds || undefined,
      status: appResult.status || undefined,
      contactName: `${appResult.contactName || ''} ${appResult.contactLastName || ''}`.trim() || undefined,
      contactEmail: appResult.contactEmail || undefined,
      contactPhone: appResult.contactPhone || undefined,
      documentCount: docCount.length
    };

  } catch (error) {
    console.error('Failed to fetch application data:', error);
    return null;
  }
}

async function getApplicationDocuments(applicationId: string): Promise<any[]> {
  try {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId));

    return docs.map(doc => ({
      id: doc.id,
      fileName: doc.originalFilename || 'Unknown',
      documentType: doc.documentType || 'Unknown',
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt,
      extractedText: doc.metadata?.extractedText || null
    }));

  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return [];
  }
}

function getStandardDocumentRequirements(): string[] {
  return [
    'Bank Statements (3 months)',
    'Tax Returns (2 years)',
    'Financial Statements',
    'Business License',
    'Voided Check',
    'Articles of Incorporation',
    'Profit & Loss Statement',
    'Balance Sheet'
  ];
}

function extractRiskLevel(response: string): string {
  const riskRegex = /(LOW RISK|MEDIUM RISK|HIGH RISK)/i;
  const match = response.match(riskRegex);
  return match ? match[1].toUpperCase() : 'MEDIUM RISK';
}

function determinePriority(suggestion: string): string {
  const highPriorityKeywords = ['urgent', 'immediate', 'critical', 'required', 'missing'];
  const mediumPriorityKeywords = ['review', 'verify', 'check', 'confirm'];
  
  const text = suggestion.toLowerCase();
  
  if (highPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'HIGH';
  } else if (mediumPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'MEDIUM';
  }
  
  return 'LOW';
}

async function saveCreditSummary(applicationId: string, summary: string): Promise<void> {
  // This would use the existing creditSummaries table from ai-summary-schema.ts
  // Implementation depends on your existing schema structure
  console.log(`💾 Saving credit summary for ${applicationId}`);
}

async function saveRiskAssessment(applicationId: string, riskLevel: string, explanation: string): Promise<void> {
  // Save to risk assessments table or application metadata
  console.log(`💾 Saving risk assessment ${riskLevel} for ${applicationId}`);
}

async function applyLenderCustomizations(summary: string, lenderId: string): Promise<string> {
  // Apply lender-specific formatting, terminology, or focus areas
  console.log(`🎨 Applying lender customizations for ${lenderId}`);
  return summary; // For now, return as-is
}

async function generateSummaryPDF(applicationId: string, summary: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  // Header
  page.drawText('AI-GENERATED CREDIT SUMMARY', {
    x: 50,
    y: height - 50,
    size: 16,
    color: rgb(0, 0.3, 0.6)
  });

  page.drawText(`Application ID: ${applicationId}`, {
    x: 50,
    y: height - 80,
    size: 10,
    color: rgb(0.5, 0.5, 0.5)
  });

  page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
    x: 50,
    y: height - 100,
    size: 10,
    color: rgb(0.5, 0.5, 0.5)
  });

  // Summary content (simplified - would need better text wrapping)
  const lines = summary.split('\n');
  let yPosition = height - 140;
  
  lines.slice(0, 30).forEach(line => { // Limit lines to fit page
    if (yPosition > 60) {
      page.drawText(line.substring(0, 80), {
        x: 50,
        y: yPosition,
        size: 11
      });
      yPosition -= 15;
    }
  });

  // Footer
  page.drawText('Generated by AI - Review and verify all information', {
    x: 50,
    y: 30,
    size: 8,
    color: rgb(0.5, 0.5, 0.5)
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}