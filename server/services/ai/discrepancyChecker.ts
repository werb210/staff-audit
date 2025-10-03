import OpenAI from "openai";
import { db } from '../../db';
import { applications, documents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { documentInsightsService, ExtractedField } from './documentInsights';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FieldDiscrepancy {
  fieldName: string;
  applicationValue: string;
  documentValue: string;
  documentSource: string; // which document
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
}

export interface DiscrepancyReport {
  applicationId: string;
  discrepancies: FieldDiscrepancy[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  checkedFields: number;
  flaggedFields: number;
  recommendations: string[];
  checkedAt: Date;
}

export class DiscrepancyCheckerService {
  // Main function to compare document fields to application data
  async compareFieldsToApplication(applicationId: string): Promise<DiscrepancyReport> {
    try {
      console.log(`[DISCREPANCY] Starting comparison for application ${applicationId}`);

      // Get application data
      const app = await db
        .select()
        .from(applications)
        .where(eq(applications.id, applicationId))
        .limit(1);

      if (app.length === 0) {
        throw new Error('Application not found');
      }

      const application = app[0];

      // Get all documents for this application
      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, applicationId));

      if (docs.length === 0) {
        console.log(`[DISCREPANCY] No documents found for application ${applicationId}`);
        return this.generateEmptyReport(applicationId);
      }

      // Extract insights from documents if not already done
      const documentInsights = await this.getDocumentInsights(docs);

      // Perform field comparisons
      const discrepancies = await this.performFieldComparisons(application, documentInsights);

      // Calculate overall risk
      const overallRisk = this.calculateOverallRisk(discrepancies);

      // Generate recommendations
      const recommendations = this.generateRecommendations(discrepancies, application);

      const report: DiscrepancyReport = {
        applicationId,
        discrepancies,
        overallRisk,
        confidence: this.calculateConfidence(discrepancies, documentInsights),
        checkedFields: this.countCheckedFields(documentInsights),
        flaggedFields: discrepancies.length,
        recommendations,
        checkedAt: new Date()
      };

      console.log(`[DISCREPANCY] Found ${discrepancies.length} discrepancies with ${overallRisk} risk`);

      return report;

    } catch (error) {
      console.error('[DISCREPANCY] Error in field comparison:', error);
      throw error;
    }
  }

  // Get or generate document insights
  private async getDocumentInsights(docs: any[]): Promise<{ [documentId: string]: ExtractedField[] }> {
    const insights: { [documentId: string]: ExtractedField[] } = {};

    for (const doc of docs) {
      try {
        // Check if insights already exist in metadata
        if (doc.metadata?.insights?.extractedFields) {
          insights[doc.id] = doc.metadata.insights.extractedFields;
        } else {
          // Generate insights if not available
          const docInsights = await documentInsightsService.extractDocumentInsights(doc.id);
          insights[doc.id] = docInsights.extractedFields;
        }
      } catch (error) {
        console.error(`[DISCREPANCY] Failed to get insights for document ${doc.id}:`, error);
        insights[doc.id] = [];
      }
    }

    return insights;
  }

  // Perform field-by-field comparisons
  private async performFieldComparisons(
    application: any, 
    documentInsights: { [documentId: string]: ExtractedField[] }
  ): Promise<FieldDiscrepancy[]> {
    const discrepancies: FieldDiscrepancy[] = [];

    // Define field mappings between application and document fields
    const fieldMappings = [
      {
        appField: 'legalBusinessName',
        docField: 'Business Name',
        severity: 'critical' as const,
        description: 'Business name mismatch between application and documents'
      },
      {
        appField: 'businessAddress',
        docField: 'Business Address',
        severity: 'high' as const,
        description: 'Business address mismatch between application and documents'
      },
      {
        appField: 'amountRequested',
        docField: 'Revenue Last Year',
        severity: 'medium' as const,
        description: 'Revenue information inconsistency',
        customComparison: true
      },
      {
        appField: 'gstNumber',
        docField: 'GST Number',
        severity: 'high' as const,
        description: 'GST number mismatch between application and documents'
      }
    ];

    // Check each field mapping
    for (const mapping of fieldMappings) {
      const appValue = application[mapping.appField];
      
      if (!appValue) continue; // Skip if no application value

      // Find document values for this field
      for (const [documentId, fields] of Object.entries(documentInsights)) {
        const docField = fields.find(f => f.label === mapping.docField);
        
        if (!docField) continue; // Skip if field not found in document

        const docValue = docField.value;

        // Perform comparison
        const isDiscrepant = mapping.customComparison 
          ? await this.performCustomComparison(mapping.appField, appValue, docValue)
          : await this.performStandardComparison(appValue, docValue);

        if (isDiscrepant) {
          // Get document info for source
          const doc = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId))
            .limit(1);

          const documentSource = doc.length > 0 ? doc[0].fileName || 'Unknown Document' : 'Unknown Document';

          discrepancies.push({
            fieldName: mapping.docField,
            applicationValue: String(appValue),
            documentValue: docValue,
            documentSource,
            severity: mapping.severity,
            description: mapping.description,
            suggestion: this.generateFieldSuggestion(mapping.docField, String(appValue), docValue)
          });
        }
      }
    }

    // Use AI for additional discrepancy detection
    const aiDiscrepancies = await this.detectAIDiscrepancies(application, documentInsights);
    discrepancies.push(...aiDiscrepancies);

    return discrepancies;
  }

  // Standard string comparison with fuzzy matching
  private async performStandardComparison(appValue: string, docValue: string): Promise<boolean> {
    if (!appValue || !docValue) return false;

    const app = appValue.toLowerCase().trim();
    const doc = docValue.toLowerCase().trim();

    // Exact match
    if (app === doc) return false;

    // Calculate similarity (simple Levenshtein-like)
    const similarity = this.calculateStringSimilarity(app, doc);
    
    // Consider it a discrepancy if similarity is below 80%
    return similarity < 0.8;
  }

  // Custom comparison for complex fields
  private async performCustomComparison(fieldName: string, appValue: any, docValue: string): Promise<boolean> {
    switch (fieldName) {
      case 'amountRequested':
        return this.compareAmountToRevenue(appValue, docValue);
      default:
        return this.performStandardComparison(String(appValue), docValue);
    }
  }

  // Compare loan amount to revenue for reasonableness
  private compareAmountToRevenue(loanAmount: number, revenueStr: string): boolean {
    const revenue = this.extractNumberFromString(revenueStr);
    if (!revenue || revenue === 0) return false;

    // Flag if loan amount is more than 2x annual revenue
    const ratio = loanAmount / revenue;
    return ratio > 2.0;
  }

  // Extract number from currency string
  private extractNumberFromString(str: string): number {
    const match = str.match(/[\d,]+\.?\d*/);
    if (!match) return 0;
    return parseFloat(match[0].replace(/,/g, ''));
  }

  // Calculate string similarity (0-1)
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  // Levenshtein distance calculation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
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

  // Use AI to detect additional discrepancies
  private async detectAIDiscrepancies(
    application: any, 
    documentInsights: { [documentId: string]: ExtractedField[] }
  ): Promise<FieldDiscrepancy[]> {
    try {
      // Prepare data for AI analysis
      const appData = {
        businessName: application.legalBusinessName,
        businessAddress: application.businessAddress,
        amountRequested: application.amountRequested,
        useOfFunds: application.useOfFunds,
        monthlyRevenue: application.monthlyRevenue
      };

      const docData = Object.entries(documentInsights).map(([docId, fields]) => ({
        documentId: docId,
        fields: fields.map(f => ({ label: f.label, value: f.value }))
      }));

      const prompt = `Analyze this loan application data against extracted document information for discrepancies:

Application Data:
${JSON.stringify(appData, null, 2)}

Document Data:
${JSON.stringify(docData, null, 2)}

Identify any discrepancies, inconsistencies, or red flags. Return a JSON array of discrepancies:
[
  {
    "fieldName": "field name",
    "issue": "description of discrepancy",
    "severity": "critical|high|medium|low"
  }
]

Focus on:
- Name variations or misspellings
- Address inconsistencies  
- Financial data that doesn't align
- Missing critical information
- Unusual patterns or red flags`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a fraud detection expert analyzing loan applications for discrepancies. Be thorough but only flag genuine concerns."
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

      const result = JSON.parse(response.choices[0].message.content || '{"discrepancies": []}');
      const aiDiscrepancies = result.discrepancies || [];

      return aiDiscrepancies.map((item: any) => ({
        fieldName: item.fieldName || 'Unknown Field',
        applicationValue: 'See application',
        documentValue: 'See documents',
        documentSource: 'AI Analysis',
        severity: ['critical', 'high', 'medium', 'low'].includes(item.severity) ? item.severity : 'medium',
        description: item.issue || 'AI detected discrepancy',
        suggestion: 'Review and verify this information manually'
      }));

    } catch (error) {
      console.error('[DISCREPANCY] AI analysis failed:', error);
      return [];
    }
  }

  // Calculate overall risk level
  private calculateOverallRisk(discrepancies: FieldDiscrepancy[]): 'low' | 'medium' | 'high' | 'critical' {
    if (discrepancies.some(d => d.severity === 'critical')) return 'critical';
    if (discrepancies.filter(d => d.severity === 'high').length >= 2) return 'high';
    if (discrepancies.filter(d => d.severity === 'high').length >= 1) return 'medium';
    if (discrepancies.length > 0) return 'medium';
    return 'low';
  }

  // Calculate confidence score
  private calculateConfidence(discrepancies: FieldDiscrepancy[], documentInsights: any): number {
    const totalFields = this.countCheckedFields(documentInsights);
    if (totalFields === 0) return 0.3;

    // Higher confidence with more fields checked and fewer discrepancies
    const discrepancyRatio = discrepancies.length / totalFields;
    return Math.max(0.3, 1 - discrepancyRatio * 0.5);
  }

  // Count total fields checked
  private countCheckedFields(documentInsights: { [documentId: string]: ExtractedField[] }): number {
    return Object.values(documentInsights)
      .reduce((total, fields) => total + fields.length, 0);
  }

  // Generate field-specific suggestion
  private generateFieldSuggestion(fieldName: string, appValue: string, docValue: string): string {
    switch (fieldName) {
      case 'Business Name':
        return 'Verify legal business name with official registration documents';
      case 'Business Address':
        return 'Confirm business address with current utility bills or lease agreement';
      case 'GST Number':
        return 'Validate GST number with Canada Revenue Agency';
      default:
        return `Verify ${fieldName} information and resolve discrepancy`;
    }
  }

  // Generate overall recommendations
  private generateRecommendations(discrepancies: FieldDiscrepancy[], application: any): string[] {
    const recommendations: string[] = [];

    if (discrepancies.length === 0) {
      recommendations.push('No significant discrepancies found in document comparison');
      return recommendations;
    }

    // Critical discrepancies
    const criticalDiscrepancies = discrepancies.filter(d => d.severity === 'critical');
    if (criticalDiscrepancies.length > 0) {
      recommendations.push('URGENT: Critical discrepancies require immediate attention before proceeding');
    }

    // Business name issues
    if (discrepancies.some(d => d.fieldName === 'Business Name')) {
      recommendations.push('Verify legal business name with incorporation documents');
    }

    // Address issues
    if (discrepancies.some(d => d.fieldName === 'Business Address')) {
      recommendations.push('Request current business license or utility bill for address verification');
    }

    // Financial discrepancies
    if (discrepancies.some(d => d.fieldName.includes('Revenue'))) {
      recommendations.push('Request additional financial documentation to clarify revenue figures');
    }

    // General recommendation
    if (discrepancies.length >= 3) {
      recommendations.push('Consider requiring additional documentation due to multiple discrepancies');
    }

    return recommendations;
  }

  // Generate empty report for applications with no documents
  private generateEmptyReport(applicationId: string): DiscrepancyReport {
    return {
      applicationId,
      discrepancies: [],
      overallRisk: 'low',
      confidence: 0,
      checkedFields: 0,
      flaggedFields: 0,
      recommendations: ['No documents available for comparison'],
      checkedAt: new Date()
    };
  }
}

export const discrepancyCheckerService = new DiscrepancyCheckerService();