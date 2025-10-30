import OpenAI from "openai";
import { db } from '../../db';
import { applications, documents, aiRiskAssessments } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export class RiskScoringService {
    // Get comprehensive risk score for an application
    async getRiskScore(applicationId) {
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
            console.log(`[RISK-SCORING] Analyzing application ${applicationId} with ${docs.length} documents`);
            // Generate AI risk assessment
            const assessment = await this.analyzeApplicationRisk(application, docs);
            // Save assessment to database
            await this.saveRiskAssessment(applicationId, assessment);
            return assessment;
        }
        catch (error) {
            console.error('[RISK-SCORING] Error calculating risk score:', error);
            return this.generateFallbackAssessment();
        }
    }
    // AI-powered risk analysis
    async analyzeApplicationRisk(application, docs) {
        const documentSummary = docs.map(doc => `- ${doc.documentType}: ${doc.status || 'uploaded'} (${doc.fileName})`).join('\n');
        const prompt = `Analyze this business loan application for risk and provide a comprehensive assessment:

BUSINESS INFORMATION:
- Legal Business Name: ${application.legalBusinessName || 'Not provided'}
- Amount Requested: $${(application.amountRequested || 0).toLocaleString()}
- Use of Funds: ${application.useOfFunds || 'Not specified'}
- Business Type: ${application.businessType || 'Not specified'}
- Monthly Revenue: $${(application.monthlyRevenue || 0).toLocaleString()}
- Time in Business: ${application.timeInBusiness || 'Not provided'}
- Credit Score: ${application.creditScore || 'Not provided'}

DOCUMENTS SUBMITTED (${docs.length} total):
${documentSummary || 'No documents listed'}

Please analyze and return a JSON object with:
{
  "riskScore": number (1-100, where 100 is highest risk),
  "riskLevel": "low|medium|high|critical",
  "riskFactors": ["list of specific risk factors"],
  "recommendations": ["list of actionable recommendations"],
  "confidence": number (0-1, confidence in assessment),
  "tags": ["relevant tags for categorization"]
}

Consider factors like:
- Business stability and longevity
- Financial health indicators
- Document completeness
- Industry risk factors
- Loan amount relative to revenue
- Use of funds appropriateness`;
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert financial risk analyst with 20+ years of experience in business lending. Provide objective, data-driven risk assessments."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 1000,
                temperature: 0.2
            });
            const result = JSON.parse(response.choices[0].message.content || '{}');
            // Validate and normalize the response
            return {
                riskScore: Math.max(1, Math.min(100, result.riskScore || 50)),
                riskLevel: this.normalizeRiskLevel(result.riskLevel),
                riskFactors: Array.isArray(result.riskFactors) ? result.riskFactors : [],
                recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
                confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
                tags: Array.isArray(result.tags) ? result.tags : []
            };
        }
        catch (error) {
            console.error('[RISK-SCORING] AI analysis failed:', error);
            return this.generateHeuristicRiskScore(application, docs);
        }
    }
    // Normalize risk level
    normalizeRiskLevel(level) {
        const normalized = level?.toLowerCase();
        if (['low', 'medium', 'high', 'critical'].includes(normalized)) {
            return normalized;
        }
        return 'medium';
    }
    // Heuristic risk scoring when AI fails
    generateHeuristicRiskScore(application, docs) {
        let riskScore = 50; // Start at medium risk
        const riskFactors = [];
        const recommendations = [];
        const tags = [];
        // Amount-based risk
        const amount = application.amountRequested || 0;
        if (amount > 500000) {
            riskScore += 15;
            riskFactors.push('High loan amount ($500K+)');
        }
        else if (amount > 100000) {
            riskScore += 5;
        }
        // Revenue-based risk
        const revenue = application.monthlyRevenue || 0;
        if (revenue === 0) {
            riskScore += 20;
            riskFactors.push('No monthly revenue reported');
        }
        else if (amount > revenue * 12) {
            riskScore += 10;
            riskFactors.push('Loan amount exceeds annual revenue');
        }
        // Document completeness
        if (docs.length < 3) {
            riskScore += 15;
            riskFactors.push('Insufficient documentation');
            recommendations.push('Request additional financial documents');
        }
        // Business age (if available)
        if (application.timeInBusiness && application.timeInBusiness.includes('month')) {
            riskScore += 10;
            riskFactors.push('New business (less than 1 year)');
        }
        // Determine risk level
        let riskLevel;
        if (riskScore >= 80)
            riskLevel = 'critical';
        else if (riskScore >= 60)
            riskLevel = 'high';
        else if (riskScore >= 40)
            riskLevel = 'medium';
        else
            riskLevel = 'low';
        // Add general recommendations
        if (riskLevel === 'high' || riskLevel === 'critical') {
            recommendations.push('Require additional collateral or guarantees');
            recommendations.push('Conduct detailed financial verification');
        }
        // Add tags
        tags.push(application.businessType || 'general-business');
        tags.push(`amount-${Math.floor(amount / 50000) * 50}k`);
        tags.push(riskLevel + '-risk');
        return {
            riskScore: Math.min(100, riskScore),
            riskLevel,
            riskFactors,
            recommendations,
            confidence: 0.6,
            tags
        };
    }
    // Document auto-tagging
    async autoTagDocument(documentId) {
        try {
            // Fetch document data
            const doc = await db
                .select()
                .from(documents)
                .where(eq(documents.id, documentId))
                .limit(1);
            if (doc.length === 0) {
                throw new Error('Document not found');
            }
            const document = doc[0];
            console.log(`[AUTO-TAG] Analyzing document ${documentId}: ${document.fileName}`);
            // Generate AI tags
            const tags = await this.analyzeDocumentForTags(document);
            // Update document with tags in metadata
            await db
                .update(documents)
                .set({
                metadata: {
                    ...document.metadata,
                    autoTags: tags,
                    taggedAt: new Date().toISOString()
                }
            })
                .where(eq(documents.id, documentId));
            return tags;
        }
        catch (error) {
            console.error('[AUTO-TAG] Error tagging document:', error);
            return this.generateFallbackTags();
        }
    }
    // AI-powered document analysis
    async analyzeDocumentForTags(document) {
        const prompt = `Analyze this business document and provide categorization tags:

Document Details:
- File Name: ${document.fileName}
- Document Type: ${document.documentType}
- File Size: ${document.fileSize ? Math.round(document.fileSize / 1024) + 'KB' : 'Unknown'}
- Upload Date: ${document.createdAt ? new Date(document.createdAt).toLocaleDateString() : 'Unknown'}

Based on the document type and filename, provide a JSON object with:
{
  "primary": "main category (e.g., financial-statement, tax-return, bank-statement)",
  "secondary": ["additional relevant tags"],
  "quality": "excellent|good|fair|poor (estimate based on naming and type)",
  "completeness": number (0-100, estimated completeness),
  "flags": ["any potential issues or requirements"]
}

Consider standard business document categories and potential quality indicators.`;
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system",
                        content: "You are a document processing expert specializing in business finance documents. Provide accurate categorization and quality assessment."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 400,
                temperature: 0.1
            });
            const result = JSON.parse(response.choices[0].message.content || '{}');
            return {
                primary: result.primary || 'uncategorized',
                secondary: Array.isArray(result.secondary) ? result.secondary : [],
                quality: ['excellent', 'good', 'fair', 'poor'].includes(result.quality) ? result.quality : 'fair',
                completeness: Math.max(0, Math.min(100, result.completeness || 50)),
                flags: Array.isArray(result.flags) ? result.flags : []
            };
        }
        catch (error) {
            console.error('[AUTO-TAG] AI tagging failed:', error);
            return this.generateHeuristicTags(document);
        }
    }
    // Heuristic document tagging
    generateHeuristicTags(document) {
        const fileName = document.fileName?.toLowerCase() || '';
        const docType = document.documentType?.toLowerCase() || '';
        let primary = 'uncategorized';
        const secondary = [];
        const flags = [];
        // Determine primary category
        if (docType.includes('bank') || fileName.includes('bank')) {
            primary = 'bank-statement';
        }
        else if (docType.includes('tax') || fileName.includes('tax')) {
            primary = 'tax-document';
        }
        else if (docType.includes('financial') || fileName.includes('financial')) {
            primary = 'financial-statement';
        }
        else if (docType.includes('id') || fileName.includes('license')) {
            primary = 'identification';
        }
        // Add secondary tags
        if (fileName.includes('2024') || fileName.includes('2023')) {
            secondary.push('recent');
        }
        if (fileName.includes('draft') || fileName.includes('temp')) {
            flags.push('Appears to be draft document');
        }
        return {
            primary,
            secondary,
            quality: 'fair',
            completeness: 75,
            flags
        };
    }
    // Save risk assessment to database
    async saveRiskAssessment(applicationId, assessment) {
        try {
            await db.insert(aiRiskAssessments).values({
                applicationId,
                riskScore: assessment.riskScore,
                riskLevel: assessment.riskLevel,
                riskFactors: assessment.riskFactors,
                recommendations: assessment.recommendations,
                confidence: assessment.confidence,
                tags: assessment.tags,
                assessedAt: new Date()
            });
            console.log(`[RISK-SCORING] Saved assessment for application ${applicationId}: ${assessment.riskLevel} risk (${assessment.riskScore})`);
        }
        catch (error) {
            console.error('[RISK-SCORING] Failed to save assessment:', error);
        }
    }
    // Generate fallback assessment
    generateFallbackAssessment() {
        return {
            riskScore: 50,
            riskLevel: 'medium',
            riskFactors: ['Unable to complete automated risk assessment'],
            recommendations: ['Manual review required'],
            confidence: 0.3,
            tags: ['requires-manual-review']
        };
    }
    // Generate fallback tags
    generateFallbackTags() {
        return {
            primary: 'uncategorized',
            secondary: [],
            quality: 'fair',
            completeness: 50,
            flags: ['Auto-tagging failed - manual review needed']
        };
    }
    // Batch process documents for an application
    async processApplicationDocuments(applicationId) {
        try {
            // Get risk score
            const riskAssessment = await this.getRiskScore(applicationId);
            // Get all documents
            const docs = await db
                .select()
                .from(documents)
                .where(eq(documents.applicationId, applicationId));
            // Process each document
            const documentTags = {};
            for (const doc of docs) {
                documentTags[doc.id] = await this.autoTagDocument(doc.id);
            }
            console.log(`[RISK-SCORING] Processed application ${applicationId}: ${docs.length} documents tagged`);
            return {
                riskAssessment,
                documentTags
            };
        }
        catch (error) {
            console.error('[RISK-SCORING] Error processing application documents:', error);
            throw error;
        }
    }
}
export const riskScoringService = new RiskScoringService();
