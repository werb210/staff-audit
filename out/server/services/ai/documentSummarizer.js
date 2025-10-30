import OpenAI from "openai";
import { db } from '../../db';
import { documents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { documentInsightsService } from './documentInsights';
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export class DocumentSummarizerService {
    SYSTEM_PROMPT = `You are a financial document analyst specializing in loan applications. Analyze documents comprehensively to identify:

1. Key financial data points and business information
2. Risk factors and red flags
3. Data quality and completeness issues
4. Cross-document consistency
5. Missing critical information

Group similar document types and provide actionable insights for lending decisions. Be thorough but concise.`;
    // Main function to summarize multiple documents
    async summarizeMultipleDocuments(applicationId) {
        try {
            console.log(`[DOC-SUMMARIZER] Starting multi-document analysis for application ${applicationId}`);
            // Get all documents for this application
            const docs = await db
                .select()
                .from(documents)
                .where(eq(documents.applicationId, applicationId));
            if (docs.length === 0) {
                return this.generateEmptySummary(applicationId);
            }
            // Categorize documents
            const categorizedDocs = this.categorizeDocuments(docs);
            // Process each category
            const sections = [];
            for (const [category, categoryDocs] of Object.entries(categorizedDocs)) {
                const section = await this.processCategoryDocuments(category, categoryDocs);
                sections.push(section);
            }
            // Generate overall analysis
            const overallAnalysis = await this.generateOverallAnalysis(docs, sections);
            // Calculate scores and metrics
            const completenessScore = this.calculateCompletenessScore(docs, sections);
            const riskScore = this.calculateRiskScore(sections);
            const missingDocuments = this.identifyMissingDocuments(docs);
            const summary = {
                applicationId,
                totalDocuments: docs.length,
                sections,
                overallInsights: overallAnalysis.insights,
                criticalFindings: overallAnalysis.criticalFindings,
                recommendations: overallAnalysis.recommendations,
                completenessScore,
                riskScore,
                missingDocuments,
                summarizedAt: new Date()
            };
            console.log(`[DOC-SUMMARIZER] Completed analysis: ${docs.length} documents, ${sections.length} categories`);
            return summary;
        }
        catch (error) {
            console.error('[DOC-SUMMARIZER] Error summarizing documents:', error);
            throw error;
        }
    }
    // Categorize documents by type
    categorizeDocuments(docs) {
        const categories = {
            'Financial Statements': [],
            'Banking Documents': [],
            'Tax Documents': [],
            'Legal Documents': [],
            'Business Documents': [],
            'Personal Documents': [],
            'Other Documents': []
        };
        for (const doc of docs) {
            const docType = doc.documentType || doc.fileName || '';
            const category = this.determineDocumentCategory(docType);
            categories[category].push(doc);
        }
        // Remove empty categories
        return Object.fromEntries(Object.entries(categories).filter(([_, docs]) => docs.length > 0));
    }
    // Determine document category based on type/name
    determineDocumentCategory(docType) {
        const type = docType.toLowerCase();
        if (type.includes('financial') || type.includes('income') || type.includes('balance') || type.includes('cashflow')) {
            return 'Financial Statements';
        }
        if (type.includes('bank') || type.includes('statement') || type.includes('account')) {
            return 'Banking Documents';
        }
        if (type.includes('tax') || type.includes('t4') || type.includes('gst') || type.includes('revenue')) {
            return 'Tax Documents';
        }
        if (type.includes('contract') || type.includes('agreement') || type.includes('lease') || type.includes('incorporation')) {
            return 'Legal Documents';
        }
        if (type.includes('license') || type.includes('permit') || type.includes('registration')) {
            return 'Business Documents';
        }
        if (type.includes('id') || type.includes('passport') || type.includes('driver')) {
            return 'Personal Documents';
        }
        return 'Other Documents';
    }
    // Process documents within a category
    async processCategoryDocuments(category, docs) {
        const processedDocs = [];
        for (const doc of docs) {
            try {
                // Extract text from document
                const text = await documentInsightsService.extractTextFromPDF(doc.filePath || doc.storageKey || '');
                if (!text) {
                    processedDocs.push({
                        id: doc.id,
                        name: doc.fileName || 'Unknown Document',
                        type: doc.documentType || 'Unknown',
                        keyPoints: ['Document could not be processed'],
                        risks: ['Unable to extract text'],
                        dataQuality: 'poor'
                    });
                    continue;
                }
                // Analyze individual document
                const analysis = await this.analyzeIndividualDocument(doc, text);
                processedDocs.push(analysis);
            }
            catch (error) {
                console.error(`[DOC-SUMMARIZER] Error processing document ${doc.id}:`, error);
                processedDocs.push({
                    id: doc.id,
                    name: doc.fileName || 'Unknown Document',
                    type: doc.documentType || 'Unknown',
                    keyPoints: ['Processing error occurred'],
                    risks: ['Document analysis failed'],
                    dataQuality: 'poor'
                });
            }
        }
        // Generate category-level insights
        const categoryAnalysis = await this.analyzeCategoryDocuments(category, processedDocs);
        return {
            category,
            documentCount: docs.length,
            documents: processedDocs,
            categoryInsights: categoryAnalysis.insights,
            categoryRisks: categoryAnalysis.risks
        };
    }
    // Analyze individual document
    async analyzeIndividualDocument(doc, text) {
        try {
            const prompt = `Analyze this ${doc.documentType || 'business'} document and extract:

1. Key data points and important information
2. Risk factors or red flags
3. Document quality assessment

Document Text:
${text.substring(0, 3000)}${text.length > 3000 ? '...' : ''}

Return JSON:
{
  "keyPoints": ["point 1", "point 2", ...],
  "risks": ["risk 1", "risk 2", ...],
  "dataQuality": "excellent|good|fair|poor"
}

Focus on financial data, business information, and lending-relevant details.`;
            const response = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system",
                        content: this.SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 600,
                temperature: 0.3
            });
            const result = JSON.parse(response.choices[0].message.content || '{}');
            return {
                id: doc.id,
                name: doc.fileName || 'Unknown Document',
                type: doc.documentType || 'Unknown',
                keyPoints: result.keyPoints || ['No key points extracted'],
                risks: result.risks || [],
                dataQuality: this.validateDataQuality(result.dataQuality)
            };
        }
        catch (error) {
            console.error('[DOC-SUMMARIZER] AI analysis failed for document:', error);
            return {
                id: doc.id,
                name: doc.fileName || 'Unknown Document',
                type: doc.documentType || 'Unknown',
                keyPoints: ['AI analysis failed'],
                risks: ['Unable to analyze document'],
                dataQuality: 'poor'
            };
        }
    }
    // Validate data quality value
    validateDataQuality(quality) {
        const validQualities = ['excellent', 'good', 'fair', 'poor'];
        return validQualities.includes(quality) ? quality : 'fair';
    }
    // Analyze category-level patterns
    async analyzeCategoryDocuments(category, docs) {
        try {
            const documentSummaries = docs.map(doc => ({
                name: doc.name,
                type: doc.type,
                keyPoints: doc.keyPoints,
                risks: doc.risks,
                quality: doc.dataQuality
            }));
            const prompt = `Analyze this collection of ${category} documents for lending purposes:

${JSON.stringify(documentSummaries, null, 2)}

Provide category-level analysis:
{
  "insights": ["insight about this document category", ...],
  "risks": ["risk specific to this category", ...]
}

Focus on:
- Completeness of documentation in this category
- Consistency across documents
- Category-specific lending risks
- Data quality patterns`;
            const response = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system",
                        content: "You are a lending analyst specializing in document completeness and risk assessment."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 500,
                temperature: 0.2
            });
            const result = JSON.parse(response.choices[0].message.content || '{}');
            return {
                insights: result.insights || [`${category} documents provided`],
                risks: result.risks || []
            };
        }
        catch (error) {
            console.error('[DOC-SUMMARIZER] Category analysis failed:', error);
            return {
                insights: [`${category} contains ${docs.length} documents`],
                risks: ['Unable to perform detailed category analysis']
            };
        }
    }
    // Generate overall analysis across all documents
    async generateOverallAnalysis(docs, sections) {
        try {
            const summaryData = {
                totalDocuments: docs.length,
                categories: sections.map(section => ({
                    category: section.category,
                    documentCount: section.documentCount,
                    insights: section.categoryInsights,
                    risks: section.categoryRisks,
                    avgQuality: this.calculateAvgQuality(section.documents)
                }))
            };
            const prompt = `Provide overall analysis for this loan application's documentation:

${JSON.stringify(summaryData, null, 2)}

Return comprehensive analysis:
{
  "insights": ["overall business/financial insights", ...],
  "criticalFindings": ["critical issues requiring attention", ...],
  "recommendations": ["specific lending recommendations", ...]
}

Focus on:
- Overall documentation completeness
- Cross-category consistency
- Lending risk assessment
- Action items for underwriters`;
            const response = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system",
                        content: "You are a senior lending officer providing final document review and recommendations."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_tokens: 800,
                temperature: 0.2
            });
            const result = JSON.parse(response.choices[0].message.content || '{}');
            return {
                insights: result.insights || ['Documentation review completed'],
                criticalFindings: result.criticalFindings || [],
                recommendations: result.recommendations || ['Standard underwriting review recommended']
            };
        }
        catch (error) {
            console.error('[DOC-SUMMARIZER] Overall analysis failed:', error);
            return {
                insights: ['AI analysis unavailable - manual review required'],
                criticalFindings: ['Unable to perform automated analysis'],
                recommendations: ['Conduct thorough manual document review']
            };
        }
    }
    // Calculate average document quality for a section
    calculateAvgQuality(docs) {
        const qualityScores = { excellent: 4, good: 3, fair: 2, poor: 1 };
        const totalScore = docs.reduce((sum, doc) => sum + qualityScores[doc.dataQuality], 0);
        return docs.length > 0 ? totalScore / docs.length : 0;
    }
    // Calculate completeness score (0-100)
    calculateCompletenessScore(docs, sections) {
        // Base score from document count
        let score = Math.min(80, docs.length * 10); // Up to 80 points for having documents
        // Bonus for having multiple categories
        score += Math.min(15, sections.length * 3);
        // Bonus for good quality documents
        const highQualityDocs = sections
            .flatMap(s => s.documents)
            .filter(d => d.dataQuality === 'excellent' || d.dataQuality === 'good');
        score += Math.min(5, highQualityDocs.length);
        return Math.min(100, score);
    }
    // Calculate overall risk score
    calculateRiskScore(sections) {
        let riskFactors = 0;
        // Count risk indicators
        for (const section of sections) {
            // Poor quality documents increase risk
            const poorQualityDocs = section.documents.filter(d => d.dataQuality === 'poor');
            riskFactors += poorQualityDocs.length;
            // Category-specific risks
            riskFactors += section.categoryRisks.length;
            // Document-specific risks
            riskFactors += section.documents.reduce((sum, doc) => sum + doc.risks.length, 0);
        }
        if (riskFactors >= 10)
            return 'critical';
        if (riskFactors >= 6)
            return 'high';
        if (riskFactors >= 3)
            return 'medium';
        return 'low';
    }
    // Identify missing critical documents
    identifyMissingDocuments(docs) {
        const missing = [];
        const docTypes = docs.map(d => (d.documentType || '').toLowerCase());
        // Check for critical document types
        const criticalDocs = [
            { type: 'financial statements', keywords: ['financial', 'income', 'balance'] },
            { type: 'bank statements', keywords: ['bank', 'statement', 'account'] },
            { type: 'tax returns', keywords: ['tax', 't4', 'revenue'] },
            { type: 'business license', keywords: ['license', 'permit', 'registration'] }
        ];
        for (const criticalDoc of criticalDocs) {
            const hasDoc = criticalDoc.keywords.some(keyword => docTypes.some(docType => docType.includes(keyword)));
            if (!hasDoc) {
                missing.push(criticalDoc.type);
            }
        }
        return missing;
    }
    // Generate empty summary for applications with no documents
    generateEmptySummary(applicationId) {
        return {
            applicationId,
            totalDocuments: 0,
            sections: [],
            overallInsights: ['No documents available for analysis'],
            criticalFindings: ['Missing all required documentation'],
            recommendations: ['Request submission of required documents before proceeding'],
            completenessScore: 0,
            riskScore: 'critical',
            missingDocuments: ['All required documents'],
            summarizedAt: new Date()
        };
    }
}
export const documentSummarizerService = new DocumentSummarizerService();
