/**
 * V2 Fraud Detection Service
 * Simplified approach using direct database queries for fraud detection
 */

import OpenAI from 'openai';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FraudAnalysisResult {
  documentId: number;
  fraudScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  similarDocuments: any[];
  fraudIndicators: string[];
  analysisData: any;
  flaggedForReview: boolean;
}

export class FraudDetectionService {

  /**
   * Analyze a document for fraud indicators
   */
  async analyzeDocument(documentId: number): Promise<FraudAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Get document details - Fixed SQL injection by validating input type
      // Validate documentId to prevent SQL injection
      const validDocumentId = Math.floor(Number(documentId));
      if (isNaN(validDocumentId) || validDocumentId <= 0) {
        throw new Error('Invalid document ID');
      }
      
      const documentResult = await db.execute(sql`
        SELECT d.*, o.extracted_data as ocr_text 
        FROM documents d 
        LEFT JOIN ocr_results o ON d.id = o.document_id::text 
        WHERE d.id = ${sql.placeholder('documentId')}
        LIMIT 1
      `, { documentId: validDocumentId });
      
      const document = documentResult.rows[0];
      if (!document) {
        throw new Error('Document not found');
      }

      const textContent = typeof document.ocr_text === 'object' 
        ? JSON.stringify(document.ocr_text) 
        : (document.ocr_text || '').toString();

      console.log(`🔍 Analyzing document ${documentId} with ${textContent.length} characters of OCR text`);

      // AI-powered fraud analysis
      const analysisPrompt = `Analyze this business document for potential fraud indicators:

Document: ${document.name}
Type: ${document.document_type}
Content: ${textContent.substring(0, 1500)}

Provide JSON response with:
1. fraudScore: 0-100 fraud risk score
2. riskLevel: Low/Medium/High/Critical  
3. fraudIndicators: array of specific fraud indicators found
4. documentFingerprint: content hash for similarity detection
5. suspiciousElements: array of concerning elements
6. confidenceLevel: 0-100 confidence in analysis

Focus on detecting document manipulation, template usage, or suspicious patterns.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a fraud detection expert. Analyze documents for manipulation, template reuse, and suspicious patterns."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Find similar documents in database
      const similarDocuments = await this.findSimilarDocuments(documentId, analysis.documentFingerprint);
      
      // Calculate final fraud score
      const finalFraudScore = Math.min(100, (analysis.fraudScore || 0) + (similarDocuments.length * 10));
      
      // Determine risk level
      let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (finalFraudScore > 85) riskLevel = 'Critical';
      else if (finalFraudScore > 70) riskLevel = 'High'; 
      else if (finalFraudScore > 50) riskLevel = 'Medium';

      const result: FraudAnalysisResult = {
        documentId,
        fraudScore: finalFraudScore,
        riskLevel,
        similarDocuments,
        fraudIndicators: analysis.fraudIndicators || [],
        analysisData: analysis,
        flaggedForReview: finalFraudScore > 75
      };

      // Save similarity results
      if (similarDocuments.length > 0) {
        await this.saveSimilarityResults(documentId, similarDocuments, analysis);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Document ${documentId} fraud analysis completed: ${finalFraudScore}/100 score, ${riskLevel} risk level (${processingTime}ms)`);

      return result;
    } catch (error) {
      console.error(`Error analyzing document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Cross-application fraud analysis
   */
  async analyzeApplication(applicationId: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Get all documents for the application - Using parameterized query to prevent SQL injection
      // Validate applicationId to prevent SQL injection
      if (typeof applicationId !== 'string' || applicationId.trim() === '') {
        throw new Error('Invalid application ID');
      }
      
      // Additional validation: check for UUID format or numeric format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const numericRegex = /^\d+$/;
      
      if (!uuidRegex.test(applicationId) && !numericRegex.test(applicationId)) {
        throw new Error('Invalid application ID format');
      }
      
      const documentsResult = await db.execute(sql`
        SELECT id FROM documents WHERE applicationId = ${sql.placeholder('applicationId')}
      `, { applicationId: applicationId });
      
      const documents = documentsResult.rows;
      console.log(`🔍 Running cross-application fraud analysis for ${applicationId} with ${documents.length} documents`);
      
      const documentAnalyses = [];
      let maxFraudScore = 0;
      let totalSimilarities = 0;
      const allFraudIndicators: string[] = [];

      // Analyze each document
      for (const doc of documents) {
        try {
          const analysis = await this.analyzeDocument(Number(doc.id));
          documentAnalyses.push(analysis);
          maxFraudScore = Math.max(maxFraudScore, analysis.fraudScore);
          totalSimilarities += analysis.similarDocuments.length;
          allFraudIndicators.push(...analysis.fraudIndicators);
        } catch (error) {
          console.error(`Error analyzing document ${doc.id}:`, error);
        }
      }

      // Calculate overall application fraud score
      const overallFraudScore = Math.min(100, maxFraudScore + (totalSimilarities * 5));
      
      // Determine risk level
      let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (overallFraudScore > 85) riskLevel = 'Critical';
      else if (overallFraudScore > 70) riskLevel = 'High'; 
      else if (overallFraudScore > 50) riskLevel = 'Medium';

      const result = {
        applicationId,
        overallFraudScore,
        riskLevel,
        documentsAnalyzed: documents.length,
        totalSimilarities,
        flaggedForManualReview: overallFraudScore > 75,
        fraudIndicators: [...new Set(allFraudIndicators)],
        documentAnalyses,
        processingTime: Date.now() - startTime
      };

      // Save application-level fraud result
      await this.saveApplicationFraudResult(result);

      console.log(`✅ Application ${applicationId} fraud analysis completed: ${overallFraudScore}/100 score, ${riskLevel} risk level`);
      
      return result;
    } catch (error) {
      console.error(`Error analyzing application ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Find similar documents using AI comparison
   */
  private async findSimilarDocuments(targetDocumentId: number, documentFingerprint: string): Promise<any[]> {
    try {
      // Get other documents for comparison - Fixed SQL injection
      const otherDocsResult = await db.execute(sql`
        SELECT d.id, d.name, d.document_type, o.extracted_data as ocr_text
        FROM documents d 
        LEFT JOIN ocr_results o ON d.id = o.document_id::text 
        WHERE d.id != ${Math.floor(Number(targetDocumentId))}
        AND o.extracted_data IS NOT NULL
        LIMIT 10
      `);
      
      const similarities = [];
      
      for (const doc of otherDocsResult.rows) {
        const docText = typeof doc.ocr_text === 'object' 
          ? JSON.stringify(doc.ocr_text) 
          : (doc.ocr_text || '').toString();
        
        // Simple similarity check based on content length and type
        if (docText.length > 100 && doc.document_type === 'bank_statements') {
          const similarityScore = await this.calculateSimilarityScore(documentFingerprint, docText);
          
          if (similarityScore > 60) {
            similarities.push({
              documentId: doc.id,
              documentName: doc.name,
              similarityScore,
              similarityType: 'content'
            });
          }
        }
      }
      
      return similarities.sort((a, b) => b.similarityScore - a.similarityScore);
    } catch (error) {
      console.error('Error finding similar documents:', error);
      return [];
    }
  }

  /**
   * Calculate similarity score between documents
   */
  private async calculateSimilarityScore(fingerprint1: string, content2: string): Promise<number> {
    try {
      // Simple content-based similarity - in production, this would use more sophisticated algorithms
      const words1 = fingerprint1.toLowerCase().split(/\s+/);
      const words2 = content2.toLowerCase().split(/\s+/).slice(0, 100); // First 100 words
      
      const commonWords = words1.filter(word => words2.includes(word));
      const similarity = (commonWords.length / Math.max(words1.length, words2.length)) * 100;
      
      return Math.min(100, similarity * 2); // Amplify for demonstration
    } catch (error) {
      console.error('Error calculating similarity:', error);
      return 0;
    }
  }

  /**
   * Save similarity results to database
   */
  private async saveSimilarityResults(documentId: number, similarities: any[], analysis: any): Promise<void> {
    try {
      // Validate documentId
      const validDocumentId = Math.floor(Number(documentId));
      if (isNaN(validDocumentId) || validDocumentId <= 0) {
        throw new Error('Invalid document ID');
      }
      
      for (const sim of similarities) {
        // Validate and sanitize all inputs
        const validSimilarDocId = Math.floor(Number(sim.documentId));
        const validSimilarityScore = Number(sim.similarityScore);
        const validSimilarityType = String(sim.similarityType).replace(/[^a-zA-Z0-9_]/g, '');
        const validConfidence = Number(analysis.confidenceLevel) || 80;
        const validRiskLevel = validSimilarityScore > 80 ? 'High' : 'Medium';
        const validFlagged = validSimilarityScore > 75;
        
        if (isNaN(validSimilarDocId) || isNaN(validSimilarityScore) || validSimilarityType === '') {
          console.warn('Skipping invalid similarity data');
          continue;
        }
        
        await db.execute(sql`
          INSERT INTO document_similarity (
            document_id, similar_document_id, similarity_score, similarity_type,
            confidence, fraud_risk_score, risk_level, reason, flagged_for_review
          ) VALUES (
            ${sql.placeholder('documentId')}, 
            ${sql.placeholder('similarDocId')}, 
            ${sql.placeholder('similarityScore')}, 
            ${sql.placeholder('similarityType')},
            ${sql.placeholder('confidence')}, 
            ${sql.placeholder('fraudRiskScore')}, 
            ${sql.placeholder('riskLevel')}, 
            'AI-detected similarity', 
            ${sql.placeholder('flagged')}
          )
          ON CONFLICT (document_id, similar_document_id) DO NOTHING
        `, {
          documentId: validDocumentId,
          similarDocId: validSimilarDocId,
          similarityScore: validSimilarityScore,
          similarityType: validSimilarityType,
          confidence: validConfidence,
          fraudRiskScore: validSimilarityScore,
          riskLevel: validRiskLevel,
          flagged: validFlagged
        });
      }
      console.log(`✅ Saved ${similarities.length} similarity results for document ${documentId}`);
    } catch (error) {
      console.error('Error saving similarity results:', error);
    }
  }

  /**
   * Save application fraud result
   */
  private async saveApplicationFraudResult(result: any): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO fraud_detection_results (
          applicationId, overall_fraud_score, risk_level, similar_documents,
          fraud_indicators, confidence_level, analysis_model, processing_time,
          flagged_for_manual_review, review_priority
        ) VALUES (
          ${sql.placeholder('applicationId')}, 
          ${sql.placeholder('overallFraudScore')}, 
          ${sql.placeholder('riskLevel')},
          ${sql.placeholder('documentAnalyses')}, 
          ${sql.placeholder('fraudIndicators')},
          85, 'gpt-4o', ${sql.placeholder('processingTime')}, 
          ${sql.placeholder('flaggedForManualReview')},
          ${sql.placeholder('reviewPriority')}
        )
      `, {
        applicationId: String(result.applicationId),
        overallFraudScore: Number(result.overallFraudScore),
        riskLevel: String(result.riskLevel),
        documentAnalyses: JSON.stringify(result.documentAnalyses),
        fraudIndicators: JSON.stringify(result.fraudIndicators),
        processingTime: Number(result.processingTime),
        flaggedForManualReview: Boolean(result.flaggedForManualReview),
        reviewPriority: result.overallFraudScore > 85 ? 'high' : 'medium'
      });
      console.log(`✅ Saved fraud detection result for application ${result.applicationId}`);
    } catch (error) {
      console.error('Error saving application fraud result:', error);
    }
  }

  /**
   * Get fraud statistics
   */
  async getStats(): Promise<any> {
    try {
      const statsResult = await db.execute(sql`
        SELECT 
          COUNT(*) as total_analyses,
          COUNT(CASE WHEN flagged_for_manual_review = true THEN 1 END) as flagged_count,
          AVG(overall_fraud_score) as avg_fraud_score,
          COUNT(CASE WHEN risk_level = 'Critical' THEN 1 END) as critical_count,
          COUNT(CASE WHEN risk_level = 'High' THEN 1 END) as high_count
        FROM fraud_detection_results
      `);
      
      return statsResult.rows[0] || {
        total_analyses: 0,
        flagged_count: 0,
        avg_fraud_score: 0,
        critical_count: 0,
        high_count: 0
      };
    } catch (error) {
      console.error('Error getting fraud stats:', error);
      return { error: 'Failed to retrieve stats' };
    }
  }

  /**
   * Get flagged applications
   */
  async getFlaggedApplications(): Promise<any[]> {
    try {
      const flaggedResult = await db.execute(sql`
        SELECT * FROM fraud_detection_results 
        WHERE flagged_for_manual_review = true 
        ORDER BY overall_fraud_score DESC, createdAt DESC
        LIMIT 50
      `);
      
      return flaggedResult.rows;
    } catch (error) {
      console.error('Error getting flagged applications:', error);
      return [];
    }
  }
}