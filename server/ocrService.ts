/**
 * 🔒 DOCUMENT SYSTEM LOCKDOWN - AUTHORIZATION REQUIRED
 * This file is protected under Document System Lockdown Policy
 * NO MODIFICATIONS without explicit owner authorization
 * Policy Date: July 17, 2025
 * Contact: System Owner for change requests
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
// Removed db import to avoid Drizzle schema issues

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface FinancialData {
  revenue?: {
    monthly?: number;
    annual?: number;
    period?: string;
    confidence?: number;
  };
  expenses?: {
    monthly?: number;
    annual?: number;
    period?: string;
    confidence?: number;
  };
  bankBalances?: {
    checking?: number;
    savings?: number;
    totalCash?: number;
    asOfDate?: string;
    confidence?: number;
  };
  dates?: {
    reportPeriod?: string;
    asOfDate?: string;
    confidence?: number;
  };
  businessInfo?: {
    businessName?: string;
    ein?: string;
    address?: string;
    confidence?: number;
  };
}

interface FieldConfidences {
  revenue: number;
  expenses: number;
  bankBalances: number;
  dates: number;
  businessInfo: number;
  overall: number;
}

export async function processDocumentOCR(
  documentId: string,
  applicationId: string,
  filePath: string,
  documentType: string
): Promise<string> {
  const startTime = Date.now();
  
  try {
    console.log(`Starting OCR processing for document ${documentId}, type: ${documentType}`);
    
    // Validate and check if file exists safely
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    
    // Ensure the file path is within allowed directories to prevent path traversal
    const resolvedPath = path.resolve(filePath);
    const allowedDir = path.resolve(process.cwd(), 'uploads');
    
    if (!resolvedPath.startsWith(allowedDir)) {
      throw new Error('File path outside allowed directory');
    }
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file extension and validate
    const fileExtension = path.extname(filePath).toLowerCase();
    const supportedImageTypes = ['.png', '.jpg', '.jpeg'];
    
    let extractedData: FinancialData;
    let fieldConfidences: FieldConfidences;
    let overallConfidence: number;

    if (supportedImageTypes.includes(fileExtension)) {
      // Process image files with GPT-4 Vision
      const result = await processImageWithVision(filePath, documentType);
      extractedData = result.data;
      fieldConfidences = result.confidences;
      overallConfidence = result.confidences.overall;
    } else if (fileExtension === '.pdf') {
      // For PDFs, we'll use a text-based approach or convert to image
      // For now, we'll create a placeholder implementation
      const result = await processPDFDocument(filePath, documentType);
      extractedData = result.data;
      fieldConfidences = result.confidences;
      overallConfidence = result.confidences.overall;
    } else if (fileExtension === '.txt') {
      // For text files, read the content and process with GPT-4
      const result = await processTextDocument(filePath, documentType);
      extractedData = result.data;
      fieldConfidences = result.confidences;
      overallConfidence = result.confidences.overall;
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    const processingTime = Date.now() - startTime;

    // Store OCR results in database using raw SQL
    console.log('✅ [OCR] Inserting OCR results into database...');
    const insertQuery = `
      INSERT INTO ocr_results (
        document_id, applicationId, extracted_data, confidence, 
        field_confidences, processing_status, processing_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, document_id, applicationId, processing_status
    `;
    
    // Use direct SQL with postgres client instead of Drizzle
    const { pool } = await import('./db');
    
    const client = await pool.connect();
    const insertResult = await client.query(insertQuery, [
      documentId,
      applicationId,
      JSON.stringify(extractedData),
      overallConfidence.toString(),
      JSON.stringify(fieldConfidences),
      "completed",
      processingTime
    ]);
    client.release();
    
    const insertedResult = { id: insertResult.rows[0]?.id || 'unknown' };

    console.log(`OCR processing completed for document ${documentId} in ${processingTime}ms with confidence ${overallConfidence}%`);
    
    // AUTO-TRIGGER 2: Run banking analysis after OCR completion for bank_statements
    if (documentType === 'bank_statements') {
      try {
        // Check if this is a test submission and skip auto-triggers
        // Use direct SQL with postgres client for application check
        const { pool: appPool } = await import('./db');
        const appClient = await appPool.connect();
        const applicationResult = await appClient.query('SELECT legal_business_name FROM applications WHERE id = $1', [applicationId]);
        appClient.release();
        const application = applicationResult.rows[0];
        if (application && application.legal_business_name?.toLowerCase().includes('test')) {
          console.log(`🚫 [AUTO] Skipping banking analysis for test application: ${application.legal_business_name}`);
        } else {
          console.log(`🤖 [AUTO] Banking analysis triggered for app ${applicationId}`);
          // Skip banking analysis auto-trigger for now to isolate OCR issue
          console.log(`🚫 [AUTO] Banking analysis temporarily disabled for debugging`);
          
          // Get the OCR text from the result we just saved
          const ocrText = (extractedData as any).text || JSON.stringify(extractedData);
          if (ocrText && ocrText.length > 10) {
            const analysis = await analyzer.analyzeBankStatement(ocrText);
            await analyzer.saveBankingAnalysis({
              applicationId,
              documentId,
              bankName: analysis.accountInfo.bankName,
              accountNumber: analysis.accountInfo.accountNumber,
              accountType: analysis.accountInfo.accountType,
              statementPeriod: analysis.accountInfo.statementPeriod,
              openingBalance: analysis.balances.openingBalance?.toString(),
              closingBalance: analysis.balances.closingBalance?.toString(),
              averageDailyBalance: analysis.balances.averageDailyBalance?.toString(),
              minimumBalance: analysis.balances.minimumBalance?.toString(),
              maximumBalance: analysis.balances.maximumBalance?.toString(),
              totalDeposits: analysis.transactionSummary.totalDeposits?.toString(),
              totalWithdrawals: analysis.transactionSummary.totalWithdrawals?.toString(),
              totalChecks: analysis.transactionSummary.totalChecks?.toString(),
              totalFees: analysis.transactionSummary.totalFees?.toString(),
              transactionCount: analysis.transactionSummary.transactionCount,
              depositCount: analysis.transactionSummary.depositCount,
              withdrawalCount: analysis.transactionSummary.withdrawalCount,
              netCashFlow: analysis.cashFlowAnalysis.netCashFlow?.toString(),
              averageMonthlyInflow: analysis.cashFlowAnalysis.averageMonthlyInflow?.toString(),
              averageMonthlyOutflow: analysis.cashFlowAnalysis.averageMonthlyOutflow?.toString(),
              cashFlowTrend: analysis.cashFlowAnalysis.cashFlowTrend,
              volatilityScore: analysis.cashFlowAnalysis.volatilityScore?.toString(),
              nsfCount: analysis.nsfAnalysis.nsfCount,
              nsfFees: analysis.nsfAnalysis.nsfFees?.toString(),
              overdraftDays: analysis.nsfAnalysis.overdraftDays,
              insufficientFundsRisk: analysis.nsfAnalysis.insufficientFundsRisk,
              businessDeposits: analysis.businessIndicators.businessDeposits?.toString(),
              personalWithdrawals: analysis.businessIndicators.personalWithdrawals?.toString(),
              operatingExpenses: analysis.businessIndicators.operatingExpenses?.toString(),
              merchantFees: analysis.businessIndicators.merchantFees?.toString(),
              employeePayments: analysis.businessIndicators.employeePayments?.toString(),
              recurringWithdrawals: analysis.transactionPatterns.recurringWithdrawals,
              largeDeposits: analysis.transactionPatterns.largeDeposits,
              unusualActivity: analysis.transactionPatterns.unusualActivity,
              transactionPatterns: analysis.transactionPatterns,
              riskFactors: analysis.riskFactors,
              financialHealthScore: analysis.financialHealthScore,
              confidenceLevel: "95",
              recommendations: analysis.recommendations,
              processingTime: Date.now() - startTime
            });
            console.log(`✅ [AUTO] Banking analysis completed for document ${documentId}`);
          }
        }
      } catch (bankingError) {
        console.warn(`⚠️ [AUTO] Banking analysis failed for document ${documentId}:`, bankingError);
      }
    }
    
    return insertedResult.id;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`OCR processing failed for document ${documentId}:`, error);

    // Store error result using raw SQL
    console.log('❌ [OCR] Storing failed OCR result in database...');
    const failedQuery = `
      INSERT INTO ocr_results (
        document_id, applicationId, extracted_data, confidence, 
        field_confidences, processing_status, processing_time_ms, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, processing_status
    `;
    
    await db.execute(failedQuery, [
      documentId,
      applicationId,
      JSON.stringify({}),
      "0",
      JSON.stringify({
        revenue: 0,
        expenses: 0,
        bankBalances: 0,
        dates: 0,
        businessInfo: 0,
        overall: 0
      }),
      "failed",
      processingTime,
      error instanceof Error ? error.message : "Unknown error"
    ]);
    throw error;
  }
}

async function processImageWithVision(filePath: string, documentType: string): Promise<{
  data: FinancialData;
  confidences: FieldConfidences;
}> {
  try {
    // Read and encode image as base64
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = getMimeType(filePath);

    const prompt = createExtractionPrompt(documentType);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a financial document analysis expert. Extract financial data from documents with high accuracy and provide confidence scores."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      data: result.extractedData || {},
      confidences: {
        revenue: result.confidences?.revenue || 0,
        expenses: result.confidences?.expenses || 0,
        bankBalances: result.confidences?.bankBalances || 0,
        dates: result.confidences?.dates || 0,
        businessInfo: result.confidences?.businessInfo || 0,
        overall: result.confidences?.overall || 0
      }
    };
  } catch (error) {
    console.error("Vision processing error:", error);
    throw new Error(`Vision processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function processTextDocument(filePath: string, documentType: string): Promise<{
  data: FinancialData;
  confidences: FieldConfidences;
}> {
  try {
    // Read text file content
    const textContent = fs.readFileSync(filePath, 'utf-8');

    const prompt = createExtractionPrompt(documentType);

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a financial document analysis expert. Extract financial data from documents with high accuracy and provide confidence scores."
        },
        {
          role: "user",
          content: `${prompt}\n\nDocument content:\n${textContent}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      data: result.extractedData || {},
      confidences: {
        revenue: result.confidences?.revenue || 0,
        expenses: result.confidences?.expenses || 0,
        bankBalances: result.confidences?.bankBalances || 0,
        dates: result.confidences?.dates || 0,
        businessInfo: result.confidences?.businessInfo || 0,
        overall: result.confidences?.overall || 0
      }
    };
  } catch (error) {
    console.error("Text processing error:", error);
    throw new Error(`Text processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function processPDFDocument(filePath: string, documentType: string): Promise<{
  data: FinancialData;
  confidences: FieldConfidences;
}> {
  // Placeholder for PDF processing
  // In a production environment, you would use a PDF-to-text library
  // or convert PDF pages to images for Vision processing
  
  console.log(`PDF processing not fully implemented for ${filePath}`);
  
  return {
    data: {
      businessInfo: {
        businessName: "PDF Processing Not Implemented",
        confidence: 0
      }
    },
    confidences: {
      revenue: 0,
      expenses: 0,
      bankBalances: 0,
      dates: 0,
      businessInfo: 10,
      overall: 5
    }
  };
}

function createExtractionPrompt(documentType: string): string {
  const basePrompt = `Analyze this financial document and extract the following information. Return your response as JSON in exactly this format:

{
  "extractedData": {
    "revenue": {
      "monthly": number_or_null,
      "annual": number_or_null,
      "period": "string_or_null",
      "confidence": number_0_to_100
    },
    "expenses": {
      "monthly": number_or_null,
      "annual": number_or_null,
      "period": "string_or_null",
      "confidence": number_0_to_100
    },
    "bankBalances": {
      "checking": number_or_null,
      "savings": number_or_null,
      "totalCash": number_or_null,
      "asOfDate": "YYYY-MM-DD_or_null",
      "confidence": number_0_to_100
    },
    "dates": {
      "reportPeriod": "string_or_null",
      "asOfDate": "YYYY-MM-DD_or_null",
      "confidence": number_0_to_100
    },
    "businessInfo": {
      "businessName": "string_or_null",
      "ein": "string_or_null",
      "address": "string_or_null",
      "confidence": number_0_to_100
    }
  },
  "confidences": {
    "revenue": number_0_to_100,
    "expenses": number_0_to_100,
    "bankBalances": number_0_to_100,
    "dates": number_0_to_100,
    "businessInfo": number_0_to_100,
    "overall": number_0_to_100
  }
}

Focus on extracting:
- Revenue figures (monthly, annual, or period-specific)
- Expense amounts and categories
- Bank account balances and cash positions
- Important dates (reporting periods, as-of dates)
- Business identification information

Document type: ${documentType}

Specific instructions for ${documentType}:`;

  switch (documentType) {
    case 'bank_statements':
      return basePrompt + `
- Look for account balances, transaction summaries
- Extract beginning and ending balances
- Identify monthly cash flow patterns
- Note statement period dates`;

    case 'tax_returns':
      return basePrompt + `
- Extract gross receipts/revenue from business income
- Identify total expenses and major expense categories
- Look for business name and EIN
- Extract tax year information`;

    case 'financial_statements':
      return basePrompt + `
- Extract revenue from income statement
- Identify total expenses and operating expenses
- Look for cash and cash equivalents from balance sheet
- Extract reporting period information`;

    default:
      return basePrompt + `
- Extract any financial figures visible
- Note document dates and business information
- Provide conservative confidence scores for unclear data`;
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

export async function getOcrResultsByDocument(documentId: string) {
  const { pool } = await import('./db');
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM ocr_results WHERE document_id = $1 ORDER BY processed_at DESC', [documentId]);
  client.release();
  return result.rows;
}

export async function getOcrResultsByApplication(applicationId: string) {
  const { pool } = await import('./db');
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM ocr_results WHERE applicationId = $1 ORDER BY processed_at DESC', [applicationId]);
  client.release();
  return result.rows;
}

// Azure-compatible OCR processing function
export async function processAzureDocumentOCR(
  documentId: string,
  applicationId: string,
  storageKey: string,
  documentType: string
): Promise<string> {
  const startTime = Date.now();
  
  try {
    console.log(`🌐 [Azure-OCR] Starting Azure OCR processing for document ${documentId}, storage key: ${storageKey}`);
    
    // Import Azure utilities
    const { AzureClient, GetObjectCommand } = await import('@aws-sdk/client-s3');
    
    // Configure Azure client
    const s3Client = new AzureClient({
      region: process.env.AZURE_REGION || 'ca-central-1',
      credentials: {
        accessKeyId: process.env.AZURE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AZURE_SECRET_ACCESS_KEY!,
      },
    });
    
    const bucketName = process.env.CORRECT_Azure_BUCKET_NAME || process.env.Azure_BUCKET_NAME || 'boreal-documents';
    
    // Get document from Azure
    console.log(`📥 [Azure-OCR] Downloading document from Azure: ${bucketName}/${storageKey}`);
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
    });
    
    const s3Response = await s3Client.send(getObjectCommand);
    const documentBody = await s3Response.Body?.transformToByteArray();
    
    if (!documentBody) {
      throw new Error('Failed to download document from Azure');
    }
    
    console.log(`✅ [Azure-OCR] Downloaded ${documentBody.length} bytes from Azure`);
    
    // Create a prompt for OCR processing based on document type
    let ocrPrompt = '';
    if (documentType === 'bank_statements') {
      ocrPrompt = `Please analyze this bank statement document and extract key financial information in JSON format. Include:
      {
        "text": "Full extracted text from the document",
        "accountInfo": {
          "bankName": "Name of the bank",
          "accountNumber": "Account number (last 4 digits only)",
          "accountType": "checking/savings/business",
          "statementPeriod": "Date range of the statement"
        },
        "balances": {
          "openingBalance": 0.00,
          "closingBalance": 0.00,
          "averageBalance": 0.00
        },
        "transactions": {
          "totalDeposits": 0.00,
          "totalWithdrawals": 0.00,
          "transactionCount": 0
        },
        "confidence": 95
      }`;
    } else {
      ocrPrompt = `Please extract all text from this document and provide it in JSON format:
      {
        "text": "Complete extracted text",
        "documentType": "${documentType}",
        "confidence": 95
      }`;
    }
    
    // Check if it's a PDF and handle accordingly
    if (storageKey.toLowerCase().endsWith('.pdf')) {
      // For PDFs, convert to image and use Vision API for better extraction
      console.log(`📄 [Azure-OCR] PDF detected, converting to image for Vision API processing...`);
      
      let pdfData: any;
      try {
        // Try pdf2pic conversion for better OCR
        const pdf2pic = await import('pdf2pic');
        const pdfBuffer = Buffer.from(documentBody);
        console.log(`📄 [Azure-OCR] Converting PDF buffer of ${pdfBuffer.length} bytes to image...`);
        
        // Convert first page of PDF to base64 image
        const convert = pdf2pic.fromBuffer(pdfBuffer, {
          density: 100,           // Output resolution
          saveFilename: "output", 
          savePath: "/tmp",      
          format: "png",          
          width: 2100,           // High resolution for better OCR
          height: 2970
        });
        
        const result = await convert(1, { responseType: "base64" }); // Convert page 1
        const base64Image = result.base64;
        
        console.log(`✅ [Azure-OCR] PDF successfully converted to PNG image (${base64Image?.length || 0} chars)`);
        
        // Now process with Vision API for better text extraction
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract ALL text content from this bank statement PDF. Include:
- Bank name and account information
- All transaction details with dates, descriptions, amounts
- Account balances (opening, closing, daily balances)
- All fees, NSF charges, and financial data
- Statement period dates
- Any other numerical or text content

Format as detailed text extraction for banking analysis.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
          temperature: 0.1
        });

        const extractedText = response.choices[0]?.message?.content || "";
        console.log(`✅ [Azure-OCR] Vision API extracted ${extractedText.length} characters from PDF`);
        
        pdfData = {
          text: extractedText,
          numpages: 1,
          info: { title: 'PDF Document - Vision API' }
        };
        
      } catch (pdfError: any) {
        console.error(`❌ [Azure-OCR] PDF conversion/Vision API failed: ${pdfError.message}`);
        
        // Enhanced fallback: Try pdf-parse as backup
        try {
          const pdfParse = await import('pdf-parse');
          const pdfBuffer = Buffer.from(documentBody);
          console.log(`🔄 [Azure-OCR] Trying pdf-parse as fallback...`);
          
          if (typeof pdfParse.default === 'function') {
            pdfData = await pdfParse.default(pdfBuffer);
          } else if (typeof pdfParse === 'function') {
            pdfData = await pdfParse(pdfBuffer);
          } else {
            throw new Error('pdf-parse function not found');
          }
          console.log(`✅ [Azure-OCR] pdf-parse fallback succeeded with ${pdfData.text?.length || 0} characters`);
        } catch (fallbackError: any) {
          console.error(`❌ [Azure-OCR] All PDF extraction methods failed: ${fallbackError.message}`);
          
          // Final fallback: Create a basic response indicating extraction failed
          pdfData = {
            text: `PDF document contains ${Buffer.from(documentBody).length} bytes. Both Vision API and pdf-parse extraction failed. Manual review required.`,
            numpages: 1,
            info: { title: 'PDF Document - Extraction Failed' }
          };
        }
      }
      
      // Create a simplified extracted data structure from PDF text
      const extractedData = {
        text: pdfData.text,
        documentType: documentType,
        confidence: pdfData.text.includes('extraction failed') ? 10 : 90,
        pages: pdfData.numpages,
        extractionMethod: pdfData.info?.title?.includes('Vision API') ? 'pdf-vision-api' : 'pdf-text'
      };
      
      const processingTime = Date.now() - startTime;
      const overallConfidence = 90;
      
      // Store OCR results in database using raw SQL
      console.log('✅ [Azure-OCR] Inserting PDF text extraction results into database...');
      const insertQuery = `
        INSERT INTO ocr_results (
          document_id, applicationId, extracted_data, confidence, 
          field_confidences, processing_status, processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, document_id, applicationId, processing_status
      `;
      
      // Use direct SQL with postgres client instead of Drizzle
      const { pool } = await import('./db');
      
      const client = await pool.connect();
      const insertResult = await client.query(insertQuery, [
        documentId,
        applicationId,
        JSON.stringify(extractedData),
        overallConfidence.toString(),
        JSON.stringify({
          overall: overallConfidence,
          text: overallConfidence,
          structure: overallConfidence - 10
        }),
        "completed",
        processingTime
      ]);
      client.release();
      
      const [insertedResult] = insertResult.rows;
      
      console.log(`✅ [Azure-OCR] PDF text extraction completed for document ${documentId} in ${processingTime}ms with confidence ${overallConfidence}%`);
      
      return insertedResult.id;
    }
    
    // For images, process with OpenAI Vision API
    console.log(`🤖 [Azure-OCR] Processing image with OpenAI Vision API...`);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Determine correct MIME type for images
    const fileExtension = storageKey.split('.').pop()?.toLowerCase();
    let mimeType: string;
    if (fileExtension === 'png') {
      mimeType = 'image/png';
    } else if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
      mimeType = 'image/jpeg';
    } else {
      throw new Error(`Unsupported image format: ${fileExtension}`);
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: ocrPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${Buffer.from(documentBody).toString('base64')}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    });
    
    const ocrContent = response.choices[0]?.message?.content;
    if (!ocrContent) {
      throw new Error('No OCR content returned from OpenAI');
    }
    
    // Parse the JSON response
    let extractedData: any;
    try {
      extractedData = JSON.parse(ocrContent);
    } catch (parseError) {
      // If JSON parsing fails, create a simple structure
      extractedData = {
        text: ocrContent,
        documentType: documentType,
        confidence: 85
      };
    }
    
    const processingTime = Date.now() - startTime;
    const overallConfidence = extractedData.confidence || 85;
    
    // Store OCR results in database using raw SQL
    console.log('✅ [Azure-OCR] Inserting OCR results into database...');
    const insertQuery = `
      INSERT INTO ocr_results (
        document_id, applicationId, extracted_data, confidence, 
        field_confidences, processing_status, processing_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, document_id, applicationId, processing_status
    `;
    
    // Use direct SQL with postgres client instead of Drizzle
    const { pool } = await import('./db');
    
    const client = await pool.connect();
    const insertResult = await client.query(insertQuery, [
      documentId,
      applicationId,
      JSON.stringify(extractedData),
      overallConfidence.toString(),
      JSON.stringify({
        overall: overallConfidence,
        text: overallConfidence,
        structure: overallConfidence - 10
      }),
      "completed",
      processingTime
    ]);
    client.release();
    
    const [insertedResult] = insertResult.rows;
    
    console.log(`✅ [Azure-OCR] OCR processing completed for document ${documentId} in ${processingTime}ms with confidence ${overallConfidence}%`);
    
    return insertedResult.id;
    
  } catch (error: any) {
    console.error(`❌ [Azure-OCR] Failed to process Azure document ${documentId}:`, error.message);
    
    // Store failed result using raw SQL
    const processingTime = Date.now() - startTime;
    console.log('❌ [Azure-OCR] Storing failed OCR result in database...');
    
    const failedQuery = `
      INSERT INTO ocr_results (
        document_id, applicationId, extracted_data, confidence, 
        field_confidences, processing_status, processing_time_ms, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, processing_status
    `;
    
    // Use direct SQL with postgres client for error handling too
    const { pool: dbPool } = await import('./db');
    const pool = dbPool;
    
    const client = await pool.connect();
    await client.query(failedQuery, [
      documentId,
      applicationId,
      JSON.stringify({ error: error.message }),
      "0",
      JSON.stringify({ overall: 0 }),
      "failed",
      processingTime,
      error.message
    ]);
    client.release();
    
    throw error;
  }
}