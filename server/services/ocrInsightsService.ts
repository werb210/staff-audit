import { db } from '../db';
import { documents, applications } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { runOcrOnDocument } from './s3OcrService';

// Document categories from the matrix
const DOCUMENT_CATEGORIES = {
  balanceSheetData: ['balance_sheet', 'financial_statements'],
  incomeStatement: ['income_statement', 'profit_loss_statement'],
  cashFlowStatements: ['cash_flow_statement', 'cash_flow'],
  taxes: ['tax_returns', 'tax_documents'],
  contracts: ['contracts', 'legal_documents'],
  invoices: ['invoices', 'receipts', 'bills']
};

// Required fields from the matrix that we search for across all documents
const REQUIRED_FIELDS = [
  'SIN', 'SSN', 'Social Insurance Number',
  'Net Income', 'Annual Revenue', 'Monthly Revenue',
  'Business Name', 'Company Name',
  'EIN', 'Business Number',
  'Account Number', 'Bank Account',
  'Assets', 'Total Assets',
  'Liabilities', 'Total Liabilities',
  'Cash Flow', 'Monthly Cash Flow',
  'Expenses', 'Operating Expenses',
  'Revenue', 'Gross Revenue',
  'Profit', 'Net Profit',
  'Date of Birth', 'DOB',
  'Address', 'Business Address',
  'Phone', 'Phone Number',
  'Email', 'Email Address'
];

interface ExtractedField {
  field: string;
  value: string;
  source: string;
  confidence?: number;
  conflict?: boolean;
}

interface OCRInsightsResult {
  balanceSheetData: { source: string; fields: ExtractedField[] };
  incomeStatement: { source: string; fields: ExtractedField[] };
  cashFlowStatements: { source: string; fields: ExtractedField[] };
  taxes: { source: string; fields: ExtractedField[] };
  contracts: { source: string; fields: ExtractedField[] };
  invoices: { source: string; fields: ExtractedField[] };
  itemsRequired: Record<string, Array<{ value: string; source: string; conflict?: boolean }>>;
  noMatchedFields: string[];
}

/**
 * Process all documents for an application and extract structured OCR insights
 */
export async function processOCRInsights(applicationId: string): Promise<OCRInsightsResult> {
  console.log(`🔍 [OCR-INSIGHTS] Starting comprehensive OCR processing for application ${applicationId}`);
  
  try {
    // Get all documents for the application
    const appDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId));
    
    if (!appDocuments.length) {
      throw new Error(`No documents found for application ${applicationId}`);
    }
    
    console.log(`📄 [OCR-INSIGHTS] Found ${appDocuments.length} documents to process`);
    
    // Initialize results structure
    const insights: OCRInsightsResult = {
      balanceSheetData: { source: '', fields: [] },
      incomeStatement: { source: '', fields: [] },
      cashFlowStatements: { source: '', fields: [] },
      taxes: { source: '', fields: [] },
      contracts: { source: '', fields: [] },
      invoices: { source: '', fields: [] },
      itemsRequired: {},
      noMatchedFields: []
    };
    
    // Track field conflicts
    const fieldTracker: Record<string, Array<{ value: string; source: string; confidence?: number }>> = {};
    
    // Process each document
    for (const doc of appDocuments) {
      console.log(`🔍 [OCR-INSIGHTS] Processing ${doc.fileName} (${doc.documentType})`);
      
      try {
        // Check if OCR results already exist using raw SQL with proper pool reference
        let ocrData;
        let pool;
        try {
          const dbModule = await import('../db');
          pool = dbModule.pool;
          const client = await pool.connect();
          const ocrQuery = await client.query('SELECT * FROM ocr_results WHERE document_id = $1 LIMIT 1', [doc.id]);
          client.release();
          ocrData = ocrQuery.rows;
        } catch (error) {
          console.error(`❌ [OCR-INSIGHTS] Database error for ${doc.fileName}:`, error.message);
          continue;
        }
        
        // If no OCR results exist, trigger OCR processing
        if (!ocrData.length && doc.storageKey) {
          console.log(`🤖 [OCR-INSIGHTS] No OCR results found, triggering OCR for ${doc.fileName}`);
          await runOcrOnDocument(doc.id);
          
          // Fetch results after processing using raw SQL
          try {
            const client2 = await pool.connect();
            const ocrQuery2 = await client2.query('SELECT * FROM ocr_results WHERE document_id = $1 LIMIT 1', [doc.id]);
            client2.release();
            ocrData = ocrQuery2.rows;
          } catch (error) {
            console.error(`❌ [OCR-INSIGHTS] Database error fetching results for ${doc.fileName}:`, error.message);
            continue;
          }
        }
        
        if (!ocrData.length) {
          console.warn(`⚠️ [OCR-INSIGHTS] No OCR data available for ${doc.fileName}`);
          insights.noMatchedFields.push(doc.fileName);
          continue;
        }
        
        const ocr = ocrData[0];
        const extractedText = ocr.extractedData?.text || '';
        
        if (!extractedText) {
          insights.noMatchedFields.push(doc.fileName);
          continue;
        }
        
        // Extract fields from OCR text
        const extractedFields = extractFieldsFromText(extractedText, doc.fileName);
        
        if (!extractedFields.length) {
          insights.noMatchedFields.push(doc.fileName);
          continue;
        }
        
        // Categorize document and add fields
        const category = categorizeDocument(doc.documentType);
        if (category && insights[category as keyof OCRInsightsResult]) {
          const categoryData = insights[category as keyof OCRInsightsResult] as { source: string; fields: ExtractedField[] };
          if (!categoryData.source) {
            categoryData.source = doc.fileName;
          }
          categoryData.fields.push(...extractedFields);
        }
        
        // Track fields for conflict detection
        extractedFields.forEach(field => {
          if (!fieldTracker[field.field]) {
            fieldTracker[field.field] = [];
          }
          fieldTracker[field.field].push({
            value: field.value,
            source: field.source,
            confidence: field.confidence
          });
        });
        
      } catch (docError) {
        console.error(`❌ [OCR-INSIGHTS] Error processing ${doc.fileName}:`, docError);
        insights.noMatchedFields.push(doc.fileName);
      }
    }
    
    // Detect conflicts and populate itemsRequired
    for (const [fieldName, occurrences] of Object.entries(fieldTracker)) {
      if (occurrences.length > 1) {
        // Check for conflicts (different values for same field)
        const uniqueValues = [...new Set(occurrences.map(o => o.value.toLowerCase().trim()))];
        const hasConflict = uniqueValues.length > 1;
        
        insights.itemsRequired[fieldName] = occurrences.map(occ => ({
          value: occ.value,
          source: occ.source,
          conflict: hasConflict && occurrences.length > 1
        }));
      } else if (occurrences.length === 1) {
        insights.itemsRequired[fieldName] = [{
          value: occurrences[0].value,
          source: occurrences[0].source
        }];
      }
    }
    
    console.log(`✅ [OCR-INSIGHTS] Processing completed for application ${applicationId}`);
    console.log(`📊 [OCR-INSIGHTS] Summary:`, {
      documentsProcessed: appDocuments.length,
      fieldsExtracted: Object.keys(insights.itemsRequired).length,
      conflicts: Object.values(insights.itemsRequired).filter(fields => 
        Array.isArray(fields) && fields.some(f => f.conflict)
      ).length,
      noMatchedFields: insights.noMatchedFields.length
    });
    
    return insights;
    
  } catch (error) {
    console.error(`❌ [OCR-INSIGHTS] Failed to process application ${applicationId}:`, error);
    throw error;
  }
}

/**
 * Extract structured fields from OCR text
 */
function extractFieldsFromText(text: string, source: string): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const textLower = text.toLowerCase();
  
  REQUIRED_FIELDS.forEach(fieldName => {
    // Create regex patterns for each field
    const patterns = [
      new RegExp(`${fieldName.toLowerCase()}[:\\s]+([^\\n\\r,]+)`, 'i'),
      new RegExp(`${fieldName.toLowerCase().replace(/\s+/g, '\\s*')}[:\\s]*([^\\n\\r,]+)`, 'i'),
      // Pattern for account numbers, SIN, etc.
      new RegExp(`\\b${fieldName.toLowerCase()}\\b[:\\s]*([0-9-\\s]+)`, 'i'),
      // Currency patterns for financial fields
      new RegExp(`${fieldName.toLowerCase()}[:\\s]*\\$?([0-9,\\.]+)`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        if (value.length > 0 && value.length < 100) { // Reasonable value length
          fields.push({
            field: fieldName,
            value: value,
            source: source,
            confidence: calculateFieldConfidence(fieldName, value)
          });
          break; // Only take first match for each field
        }
      }
    }
  });
  
  return fields;
}

/**
 * Categorize document type into predefined categories
 */
function categorizeDocument(documentType: string): string | null {
  for (const [category, types] of Object.entries(DOCUMENT_CATEGORIES)) {
    if (types.includes(documentType)) {
      return category;
    }
  }
  return null;
}

/**
 * Calculate confidence score for extracted field
 */
function calculateFieldConfidence(fieldName: string, value: string): number {
  let confidence = 70; // Base confidence
  
  // Higher confidence for structured data
  if (fieldName.includes('SIN') || fieldName.includes('SSN')) {
    if (/^\d{3}-\d{3}-\d{3}$/.test(value)) confidence = 95;
    else if (/^\d{9}$/.test(value)) confidence = 90;
  }
  
  if (fieldName.includes('Email')) {
    if (/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(value)) confidence = 95;
  }
  
  if (fieldName.includes('Phone')) {
    if (/^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(value.replace(/\D/g, ''))) confidence = 95;
  }
  
  // Financial amounts
  if (fieldName.includes('Revenue') || fieldName.includes('Income') || fieldName.includes('Assets')) {
    if (/^\$?[\d,]+\.?\d*$/.test(value)) confidence = 85;
  }
  
  return confidence;
}

/**
 * Run comprehensive OCR processing on all applications
 */
export async function runComprehensiveOCRAnalysis(): Promise<{
  processedApplications: number;
  totalDocuments: number;
  ocrResults: number;
  errors: string[];
}> {
  console.log(`🚀 [COMPREHENSIVE-OCR] Starting comprehensive OCR analysis on all applications`);
  
  try {
    // Get all applications
    const allApplications = await db.select().from(applications);
    
    let processedApplications = 0;
    let totalDocuments = 0;
    let ocrResults = 0;
    const errors: string[] = [];
    
    for (const app of allApplications) {
      try {
        console.log(`🔍 [COMPREHENSIVE-OCR] Processing application ${app.id}`);
        
        // Get documents for this application
        const appDocs = await db
          .select()
          .from(documents)
          .where(eq(documents.applicationId, app.id));
        
        totalDocuments += appDocs.length;
        
        if (!appDocs.length) {
          console.log(`⚠️ [COMPREHENSIVE-OCR] No documents found for application ${app.id}`);
          continue;
        }
        
        // Process each document that needs OCR
        for (const doc of appDocs) {
          if (doc.storageKey) {
            try {
              // Check if OCR already exists
              const existingOCR = await db
                .select()
                .from(ocrResults)
                .where(eq(ocrResults.documentId, doc.id));
              
              if (!existingOCR.length) {
                console.log(`🤖 [COMPREHENSIVE-OCR] Running OCR on ${doc.fileName}`);
                await runOcrOnDocument(doc.id);
                ocrResults++;
              } else {
                console.log(`✅ [COMPREHENSIVE-OCR] OCR already exists for ${doc.fileName}`);
                ocrResults++;
              }
            } catch (docError) {
              const errorMsg = `Failed to process ${doc.fileName}: ${docError.message}`;
              console.error(`❌ [COMPREHENSIVE-OCR] ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
        }
        
        processedApplications++;
        
      } catch (appError) {
        const errorMsg = `Failed to process application ${app.id}: ${appError.message}`;
        console.error(`❌ [COMPREHENSIVE-OCR] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`✅ [COMPREHENSIVE-OCR] Analysis completed:`, {
      processedApplications,
      totalDocuments,
      ocrResults,
      errors: errors.length
    });
    
    return {
      processedApplications,
      totalDocuments,
      ocrResults,
      errors
    };
    
  } catch (error) {
    console.error(`❌ [COMPREHENSIVE-OCR] Failed to run comprehensive analysis:`, error);
    throw error;
  }
}