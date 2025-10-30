import OpenAI from "openai";
import { REQUIRED_FIELDS } from './requiredFieldsList';
import { db } from '../../db';
import { documents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import pdf from 'pdf-parse';
import fs from 'fs';
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export class DocumentInsightsService {
    // Extract text from PDF file
    async extractTextFromPDF(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdf(dataBuffer);
            return pdfData.text;
        }
        catch (error) {
            console.error('[DOC-INSIGHTS] PDF extraction failed:', error);
            return '';
        }
    }
    // Extract required fields from document using regex patterns
    async extractRequiredFieldsRegex(text) {
        const extractedFields = [];
        for (const field of REQUIRED_FIELDS) {
            // Try field label
            let pattern = field.pattern || `${field.label}[:\\s]+(.+?)(?:\\n|$)`;
            let match = new RegExp(pattern, 'i').exec(text);
            if (!match && field.aliases) {
                // Try aliases if label didn't match
                for (const alias of field.aliases) {
                    pattern = field.pattern || `${alias}[:\\s]+(.+?)(?:\\n|$)`;
                    match = new RegExp(pattern, 'i').exec(text);
                    if (match)
                        break;
                }
            }
            if (match && match[1]) {
                extractedFields.push({
                    label: field.label,
                    value: match[1].trim(),
                    confidence: 0.8,
                    method: 'regex'
                });
            }
        }
        return extractedFields;
    }
    // Use AI to extract fields when regex fails
    async extractRequiredFieldsAI(text, missingFields) {
        if (missingFields.length === 0)
            return [];
        try {
            const prompt = `Extract the following business information from this document text:

Required Fields:
${missingFields.map(field => `- ${field}`).join('\n')}

Document Text:
${text.substring(0, 4000)} ${text.length > 4000 ? '...' : ''}

Return a JSON object with extracted values:
{
  "extractedFields": [
    {
      "label": "field name",
      "value": "extracted value",
      "confidence": 0.9
    }
  ]
}

Only include fields that are clearly found in the document. If a field is not found or unclear, don't include it.`;
            const response = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system",
                        content: "You are a document processing expert. Extract business information accurately from documents. Only return values that are clearly stated in the text."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 800,
                temperature: 0.1
            });
            const result = JSON.parse(response.choices[0].message.content || '{"extractedFields": []}');
            return (result.extractedFields || []).map((field) => ({
                label: field.label,
                value: field.value,
                confidence: Math.max(0, Math.min(1, field.confidence || 0.7)),
                method: 'ai'
            }));
        }
        catch (error) {
            console.error('[DOC-INSIGHTS] AI extraction failed:', error);
            return [];
        }
    }
    // Assess document quality
    async assessDocumentQuality(text, fileName) {
        const issues = [];
        let qualityScore = 100;
        // Check text length and readability
        if (text.length < 100) {
            issues.push('Document appears to be very short or poorly scanned');
            qualityScore -= 30;
        }
        // Check for common OCR issues
        const ocrErrorIndicators = [
            /[^\w\s.,!?:;()-]/g, // Strange characters
            /\s{5,}/g, // Large gaps
            /[A-Z]{10,}/g // Long strings of capitals
        ];
        for (const indicator of ocrErrorIndicators) {
            const matches = text.match(indicator);
            if (matches && matches.length > 10) {
                issues.push('Possible OCR scanning issues detected');
                qualityScore -= 15;
                break;
            }
        }
        // Check file name for quality indicators
        const fileName_lower = fileName.toLowerCase();
        if (fileName_lower.includes('draft') || fileName_lower.includes('temp')) {
            issues.push('File appears to be a draft or temporary document');
            qualityScore -= 10;
        }
        // Determine quality level
        let quality;
        if (qualityScore >= 90)
            quality = 'excellent';
        else if (qualityScore >= 75)
            quality = 'good';
        else if (qualityScore >= 60)
            quality = 'fair';
        else
            quality = 'poor';
        return {
            quality,
            confidence: qualityScore / 100,
            issues
        };
    }
    // Main function to extract insights from a document
    async extractDocumentInsights(documentId) {
        try {
            // Get document from database
            const doc = await db
                .select()
                .from(documents)
                .where(eq(documents.id, documentId))
                .limit(1);
            if (doc.length === 0) {
                throw new Error('Document not found');
            }
            const document = doc[0];
            const filePath = document.filePath || document.storageKey;
            if (!filePath) {
                throw new Error('Document file path not found');
            }
            console.log(`[DOC-INSIGHTS] Processing document ${documentId}: ${document.fileName}`);
            // Extract text from document
            const text = await this.extractTextFromPDF(filePath);
            if (!text) {
                throw new Error('Could not extract text from document');
            }
            // Extract fields using regex patterns first
            const regexFields = await this.extractRequiredFieldsRegex(text);
            // Find missing required fields
            const extractedLabels = regexFields.map(f => f.label);
            const missingFields = REQUIRED_FIELDS
                .filter(field => field.required && !extractedLabels.includes(field.label))
                .map(field => field.label);
            // Use AI to extract missing fields
            const aiFields = await this.extractRequiredFieldsAI(text, missingFields);
            // Combine all extracted fields
            const extractedFields = [...regexFields, ...aiFields];
            // Assess document quality
            const qualityAssessment = await this.assessDocumentQuality(text, document.fileName || '');
            // Calculate overall extraction confidence
            const avgConfidence = extractedFields.length > 0
                ? extractedFields.reduce((sum, field) => sum + field.confidence, 0) / extractedFields.length
                : 0;
            // Generate suggestions
            const suggestions = await this.generateSuggestions(extractedFields, missingFields, qualityAssessment);
            // Still missing fields after AI extraction
            const stillMissingFields = REQUIRED_FIELDS
                .filter(field => field.required)
                .map(field => field.label)
                .filter(label => !extractedFields.some(f => f.label === label));
            const insights = {
                documentId,
                extractedFields,
                missingFields: stillMissingFields,
                documentQuality: qualityAssessment.quality,
                extractionConfidence: avgConfidence,
                suggestions,
                extractedAt: new Date()
            };
            // Update document with insights
            await this.saveInsightsToDocument(documentId, insights);
            console.log(`[DOC-INSIGHTS] Completed analysis: ${extractedFields.length} fields extracted, ${stillMissingFields.length} missing`);
            return insights;
        }
        catch (error) {
            console.error('[DOC-INSIGHTS] Error extracting insights:', error);
            throw error;
        }
    }
    // Generate actionable suggestions
    async generateSuggestions(extractedFields, missingFields, qualityAssessment) {
        const suggestions = [];
        // Quality-based suggestions
        if (qualityAssessment.quality === 'poor') {
            suggestions.push('Document quality is poor - consider requesting a higher quality scan');
        }
        // Missing field suggestions
        if (missingFields.length > 0) {
            suggestions.push(`Request additional documentation containing: ${missingFields.join(', ')}`);
        }
        // Low confidence suggestions
        const lowConfidenceFields = extractedFields.filter(f => f.confidence < 0.6);
        if (lowConfidenceFields.length > 0) {
            suggestions.push('Some extracted information has low confidence - manual verification recommended');
        }
        // Field-specific suggestions
        const businessNameField = extractedFields.find(f => f.label === 'Business Name');
        if (!businessNameField) {
            suggestions.push('Business name not found - ensure legal business name is clearly stated');
        }
        const revenueFields = extractedFields.filter(f => f.label.includes('Revenue'));
        if (revenueFields.length === 0) {
            suggestions.push('No revenue information found - request financial statements or tax returns');
        }
        return suggestions;
    }
    // Save insights to document metadata
    async saveInsightsToDocument(documentId, insights) {
        try {
            await db
                .update(documents)
                .set({
                metadata: {
                    insights: {
                        extractedFields: insights.extractedFields,
                        missingFields: insights.missingFields,
                        documentQuality: insights.documentQuality,
                        extractionConfidence: insights.extractionConfidence,
                        suggestions: insights.suggestions,
                        extractedAt: insights.extractedAt.toISOString()
                    }
                }
            })
                .where(eq(documents.id, documentId));
            console.log(`[DOC-INSIGHTS] Saved insights to document ${documentId}`);
        }
        catch (error) {
            console.error('[DOC-INSIGHTS] Failed to save insights:', error);
        }
    }
    // Batch process multiple documents
    async batchProcessDocuments(documentIds) {
        const processed = [];
        const errors = [];
        for (const documentId of documentIds) {
            try {
                const insights = await this.extractDocumentInsights(documentId);
                processed.push(insights);
            }
            catch (error) {
                errors.push({
                    documentId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return { processed, errors };
    }
}
export const documentInsightsService = new DocumentInsightsService();
