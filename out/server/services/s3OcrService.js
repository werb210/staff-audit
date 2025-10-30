/**
 * 🤖 S3-INTEGRATED OCR + BANKING ANALYSIS SERVICE
 *
 * Complete OCR system with:
 * - S3 document reading via pre-signed URLs
 * - Automatic OCR processing on upload
 * - Auto-trigger banking analysis for bank statements
 * - 4-hour S3 URL expiry as requested
 *
 * Created: July 26, 2025
 */
import OpenAI from "openai";
import { db } from "../db";
import { documents } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { S3Storage } from "../utils/s3";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const s3Storage = new S3Storage();
/**
 * Main OCR function with S3 integration
 * Reads documents directly from S3 using pre-signed URLs
 */
export async function runOcrOnDocument(documentId) {
    const startTime = Date.now();
    try {
        console.log(`🤖 [OCR] Starting OCR processing for document ${documentId}`);
        // Get document from database
        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId));
        if (!document) {
            throw new Error(`Document ${documentId} not found`);
        }
        if (!document.storageKey) {
            throw new Error(`Document ${documentId} has no S3 storage key`);
        }
        console.log(`📄 [OCR] Processing: ${document.fileName} (${document.documentType})`);
        console.log(`☁️ [OCR] S3 Storage Key: ${document.storageKey}`);
        // Generate 4-hour pre-signed URL for OCR processing
        const preSignedUrl = await s3Storage.getPreSignedUrl(document.storageKey, 60 * 60 * 4); // 4 hours
        console.log(`🔗 [OCR] Generated 4-hour pre-signed URL for processing`);
        // Process document based on file type
        let ocrResult;
        const isPDF = document.fileName.toLowerCase().endsWith('.pdf');
        console.log(`🔍 [OCR] File type check: ${document.fileName} -> isPDF: ${isPDF}`);
        if (isPDF) {
            // For PDFs, download and convert to image first
            console.log(`📄 [OCR] PDF detected - converting to image for Vision API processing`);
            ocrResult = await processPDFDocument(preSignedUrl, document.documentType, document.fileName);
        }
        else {
            // For images, process directly with Vision API
            console.log(`🖼️ [OCR] Image detected - processing directly with Vision API`);
            ocrResult = await processDocumentWithVision(preSignedUrl, document.documentType, document.fileName);
        }
        // Save OCR results to database using raw SQL to match existing pattern
        const ocrId = uuidv4();
        try {
            const { pool } = await import('../db');
            const client = await pool.connect();
            const insertQuery = `
        INSERT INTO ocr_results (
          id, document_id, applicationId, extracted_data, confidence, 
          processing_time_ms, processing_status, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
      `;
            const insertResult = await client.query(insertQuery, [
                ocrId,
                document.id,
                document.applicationId,
                JSON.stringify(ocrResult.extractedData),
                ocrResult.confidence.toString(),
                (Date.now() - startTime).toString(),
                'completed'
            ]);
            client.release();
            console.log(`✅ [OCR] Results saved to database with ID: ${insertResult.rows[0]?.id}`);
        }
        catch (dbError) {
            console.error(`❌ [OCR] Database insertion failed:`, dbError);
            // Don't throw here - OCR was successful, just database save failed
        }
        console.log(`✅ [OCR] Processing completed for ${document.fileName} in ${Date.now() - startTime}ms`);
        console.log(`📊 [OCR] Confidence: ${ocrResult.confidence}%`);
        // AUTO-TRIGGER: Banking analysis for bank statements
        if (document.documentType === 'bank_statements' || document.documentType === 'bank_statement') {
            try {
                console.log(`🏦 [AUTO-BANKING] Triggering banking analysis for bank statement...`);
                await runBankingAnalysis(document.id, ocrResult.text);
                console.log(`✅ [AUTO-BANKING] Banking analysis completed for document ${documentId}`);
            }
            catch (bankingError) {
                console.warn(`⚠️ [AUTO-BANKING] Banking analysis failed for document ${documentId}:`, bankingError);
            }
        }
        return ocrId;
    }
    catch (error) {
        console.error(`❌ [OCR] Failed to process document ${documentId}:`, error);
        throw error;
    }
}
/**
 * Process document using OpenAI Vision API
 */
async function processDocumentWithVision(imageUrl, documentType, fileName) {
    try {
        console.log(`🔍 [VISION] Processing document via OpenAI Vision API`);
        const prompt = getPromptForDocumentType(documentType);
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
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
                                url: imageUrl,
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
        // Parse structured data based on document type
        const extractedData = parseExtractedData(extractedText, documentType);
        // Calculate confidence score
        const confidence = calculateConfidenceScore(extractedData, extractedText);
        console.log(`✅ [VISION] Extracted ${extractedText.length} characters of text`);
        return {
            text: extractedText,
            confidence,
            extractedData
        };
    }
    catch (error) {
        console.error('❌ [VISION] OpenAI Vision API error:', error);
        throw new Error(`Vision API processing failed: ${error.message}`);
    }
}
/**
 * Process PDF document by converting to image first, then using Vision API
 */
async function processPDFDocument(preSignedUrl, documentType, fileName) {
    try {
        console.log(`📄 [PDF-OCR] Processing PDF document: ${fileName}`);
        // Download PDF from S3
        const response = await fetch(preSignedUrl);
        if (!response.ok) {
            throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
        }
        const pdfBuffer = await response.arrayBuffer();
        console.log(`📥 [PDF-OCR] Downloaded PDF buffer: ${pdfBuffer.byteLength} bytes`);
        // Convert PDF to image using pdf2pic
        const pdf2pic = await import('pdf2pic');
        const convert = pdf2pic.fromBuffer(Buffer.from(pdfBuffer), {
            density: 150, // Higher resolution for better OCR
            saveFilename: "temp",
            savePath: "/tmp",
            format: "png",
            width: 2100, // High resolution
            height: 2970
        });
        // Convert first page to base64 image
        const result = await convert(1, { responseType: "base64" });
        console.log(`🔍 [PDF-OCR] Conversion result:`, {
            hasResult: !!result,
            hasBase64: !!result?.base64,
            resultType: typeof result,
            keys: result ? Object.keys(result) : 'no result',
            base64Length: result?.base64?.length || 0
        });
        // Try different ways to access the base64 data
        let base64Image = result?.base64;
        // If base64 is empty, try accessing it differently
        if (!base64Image && result) {
            // Sometimes pdf2pic returns the base64 in different formats
            base64Image = result.base64 || result.buffer?.toString('base64') || result.image;
            console.log(`🔄 [PDF-OCR] Alternative base64 access attempt: ${!!base64Image} (length: ${base64Image?.length || 0})`);
        }
        console.log(`🔄 [PDF-OCR] PDF converted to image: ${base64Image?.length || 0} chars base64`);
        if (!base64Image) {
            console.warn(`⚠️ [PDF-OCR] PDF to image conversion failed for ${fileName}. Trying direct PDF text extraction...`);
            // Fallback: try to extract text directly from PDF buffer using pdf-parse with buffer approach
            try {
                const pdfParse = (await import('pdf-parse')).default;
                const pdfData = await pdfParse(Buffer.from(pdfBuffer));
                console.log(`✅ [PDF-OCR] Direct text extraction successful: ${pdfData.text?.length || 0} characters`);
                const extractedData = parseExtractedData(pdfData.text, documentType);
                return {
                    extractedData,
                    text: pdfData.text || "",
                    confidence: 85 // Lower confidence for direct text extraction
                };
            }
            catch (directError) {
                console.error(`❌ [PDF-OCR] Direct text extraction also failed:`, directError);
                throw new Error("PDF processing failed - unable to convert to image or extract text directly");
            }
        }
        // Process the converted image with Vision API
        const prompt = getPromptForDocumentType(documentType);
        const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `${prompt}\n\nThis is a PDF document that has been converted to an image. Extract ALL text content including account numbers, transaction details, balances, and financial data.`
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
        const extractedText = openaiResponse.choices[0]?.message?.content || "";
        console.log(`✅ [PDF-OCR] Vision API extracted ${extractedText.length} characters from PDF`);
        // Parse structured data based on document type
        const extractedData = parseExtractedData(extractedText, documentType);
        // Calculate confidence score
        const confidence = calculateConfidenceScore(extractedData, extractedText);
        return {
            text: extractedText,
            confidence,
            extractedData
        };
    }
    catch (error) {
        console.error('❌ [PDF-OCR] PDF processing failed:', error);
        // Fallback: Try text-based extraction
        try {
            console.log('🔄 [PDF-OCR] Trying fallback pdf-parse extraction...');
            // Download PDF again for text extraction
            const response = await fetch(preSignedUrl);
            const pdfBuffer = await response.arrayBuffer();
            const pdfParse = (await import('pdf-parse')).default;
            const pdfData = await pdfParse(Buffer.from(pdfBuffer));
            console.log(`✅ [PDF-OCR] Fallback text extraction: ${pdfData.text?.length || 0} characters`);
            const extractedData = parseExtractedData(pdfData.text, documentType);
            const confidence = calculateConfidenceScore(extractedData, pdfData.text);
            return {
                text: pdfData.text || 'No text extracted from PDF',
                confidence: Math.max(confidence, 10), // Minimum 10% confidence
                extractedData
            };
        }
        catch (fallbackError) {
            console.error('❌ [PDF-OCR] All PDF extraction methods failed:', fallbackError);
            // Final fallback with minimal data
            return {
                text: `PDF processing failed for ${fileName}. Manual review required.`,
                confidence: 5,
                extractedData: { documentType, fileName, error: 'PDF extraction failed' }
            };
        }
    }
}
/**
 * Get document-specific OCR prompt
 */
function getPromptForDocumentType(documentType) {
    switch (documentType) {
        case 'bank_statements':
        case 'bank_statement':
            return `Extract all text and financial data from this bank statement. Include:
- Account information (bank name, account number, account type)
- Statement period dates
- Opening and closing balances
- All transactions with dates, descriptions, and amounts
- Any fees, NSF charges, or overdrafts
- Monthly summaries and totals
Format the response as structured data with clear sections.`;
        case 'financial_statements':
        case 'financial_statement':
            return `Extract financial data from this statement. Include:
- Revenue/income figures (monthly, quarterly, annual)
- Expenses and costs
- Cash balances and assets
- Business information (name, EIN, address)
- Report period and dates
- Any key financial ratios or metrics
Format as structured financial data.`;
        case 'tax_returns':
        case 'tax_return':
            return `Extract tax information from this return. Include:
- Business name and EIN
- Tax year and filing information
- Revenue and income figures
- Deductions and expenses
- Tax calculations and amounts owed/refunded
Format as structured tax data.`;
        default:
            return `Extract all text and relevant business/financial information from this document. 
Include any numerical data, dates, business information, and financial figures.
Format the response as structured data.`;
    }
}
/**
 * Parse extracted text into structured data
 */
function parseExtractedData(text, documentType) {
    try {
        // Attempt to parse as JSON if formatted as such
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            return JSON.parse(text);
        }
        // Basic parsing for different document types
        const data = {
            rawText: text,
            documentType,
            extractedAt: new Date().toISOString()
        };
        // Extract common financial patterns
        const amountPattern = /\$?[\d,]+\.?\d*/g;
        const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g;
        const amounts = text.match(amountPattern) || [];
        const dates = text.match(datePattern) || [];
        data.amounts = amounts.slice(0, 20); // Limit to prevent bloat
        data.dates = dates.slice(0, 10);
        // Document-specific extraction
        if (documentType.includes('bank')) {
            data.bankInfo = extractBankInfo(text);
        }
        else if (documentType.includes('financial')) {
            data.financialInfo = extractFinancialInfo(text);
        }
        return data;
    }
    catch (error) {
        console.warn('⚠️ [PARSE] Failed to parse extracted data:', error);
        return { rawText: text, error: error.message };
    }
}
/**
 * Extract bank-specific information
 */
function extractBankInfo(text) {
    const bankInfo = {};
    // Common bank name patterns
    const bankNames = ['TD Bank', 'RBC', 'BMO', 'Scotiabank', 'CIBC', 'Chase', 'Bank of America', 'Wells Fargo'];
    for (const bank of bankNames) {
        if (text.includes(bank)) {
            bankInfo.bankName = bank;
            break;
        }
    }
    // Account number pattern
    const accountMatch = text.match(/Account\s*#?\s*:?\s*(\d+)/i);
    if (accountMatch) {
        bankInfo.accountNumber = accountMatch[1];
    }
    // Balance patterns
    const balanceMatch = text.match(/Balance\s*:?\s*\$?([\d,]+\.?\d*)/i);
    if (balanceMatch) {
        bankInfo.balance = balanceMatch[1];
    }
    return bankInfo;
}
/**
 * Extract financial statement information
 */
function extractFinancialInfo(text) {
    const financialInfo = {};
    // Revenue patterns
    const revenueMatch = text.match(/Revenue\s*:?\s*\$?([\d,]+\.?\d*)/i) ||
        text.match(/Income\s*:?\s*\$?([\d,]+\.?\d*)/i);
    if (revenueMatch) {
        financialInfo.revenue = revenueMatch[1];
    }
    // Expense patterns
    const expenseMatch = text.match(/Expenses?\s*:?\s*\$?([\d,]+\.?\d*)/i);
    if (expenseMatch) {
        financialInfo.expenses = expenseMatch[1];
    }
    return financialInfo;
}
/**
 * Calculate confidence score based on extracted data quality
 */
function calculateConfidenceScore(extractedData, rawText) {
    let score = 50; // Base score
    // Boost for structured data
    if (extractedData && typeof extractedData === 'object' && !extractedData.error) {
        score += 20;
    }
    // Boost for text length (more content = higher confidence)
    if (rawText.length > 500)
        score += 15;
    if (rawText.length > 1000)
        score += 10;
    // Boost for financial data patterns
    if (rawText.includes('$') || rawText.includes('Balance') || rawText.includes('Account')) {
        score += 10;
    }
    // Boost for date patterns
    if (rawText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) {
        score += 5;
    }
    return Math.min(score, 95); // Cap at 95%
}
/**
 * Run banking analysis on OCR text
 */
async function runBankingAnalysis(documentId, ocrText) {
    try {
        console.log(`🏦 [BANKING] Starting banking analysis for document ${documentId}`);
        // Import banking analyzer
        const { BankStatementAnalyzer } = await import('../bank-statement-analyzer');
        const analyzer = new BankStatementAnalyzer();
        // Get document info
        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId));
        if (!document) {
            throw new Error(`Document ${documentId} not found for banking analysis`);
        }
        // Run analysis
        const analysis = await analyzer.analyzeBankStatement(ocrText);
        // Save banking analysis results
        await analyzer.saveBankingAnalysis({
            applicationId: document.applicationId,
            documentId: document.id,
            bankName: analysis.accountInfo.bankName,
            accountNumber: analysis.accountInfo.accountNumber,
            accountType: analysis.accountInfo.accountType,
            statementPeriod: analysis.accountInfo.statementPeriod,
            openingBalance: analysis.balances.openingBalance?.toString(),
            closingBalance: analysis.balances.closingBalance?.toString(),
            averageDailyBalance: analysis.balances.averageDailyBalance?.toString(),
            totalDeposits: analysis.balances.totalDeposits?.toString(),
            totalWithdrawals: analysis.balances.totalWithdrawals?.toString(),
            depositCount: analysis.depositAnalysis.depositCount,
            averageDepositAmount: analysis.depositAnalysis.averageDepositAmount?.toString(),
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
            processingTime: Date.now() - Date.now()
        });
        console.log(`✅ [BANKING] Banking analysis completed for document ${documentId}`);
    }
    catch (error) {
        console.error(`❌ [BANKING] Banking analysis failed for document ${documentId}:`, error);
        throw error;
    }
}
/**
 * Process all documents for an application
 */
export async function processApplicationDocuments(applicationId) {
    try {
        console.log(`📋 [BATCH-OCR] Processing all documents for application ${applicationId}`);
        // Get all documents for application
        const appDocuments = await db
            .select()
            .from(documents)
            .where(eq(documents.applicationId, applicationId));
        console.log(`📄 [BATCH-OCR] Found ${appDocuments.length} documents to process`);
        // Process each document
        for (const document of appDocuments) {
            if (document.storageKey) {
                try {
                    await runOcrOnDocument(document.id);
                    console.log(`✅ [BATCH-OCR] Processed: ${document.fileName}`);
                }
                catch (error) {
                    console.warn(`⚠️ [BATCH-OCR] Failed to process ${document.fileName}:`, error);
                }
            }
            else {
                console.warn(`⚠️ [BATCH-OCR] Skipping ${document.fileName} - no S3 storage key`);
            }
        }
        console.log(`✅ [BATCH-OCR] Completed processing for application ${applicationId}`);
    }
    catch (error) {
        console.error(`❌ [BATCH-OCR] Failed to process application documents:`, error);
        throw error;
    }
}
