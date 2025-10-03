import OpenAI from "openai";
import { db } from '../../db';
import { documents } from '../../../shared/schema';
import { eq, inArray } from 'drizzle-orm';
import { documentInsightsService, ExtractedField } from './documentInsights';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FieldEntry {
  value: string;
  documentType: string;
  documentId: string;
  documentName: string;
  confidence: number;
  method: 'regex' | 'ai' | 'manual';
}

export interface FieldConflict {
  fieldName: string;
  conflictingValues: FieldEntry[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  aiResolution?: string;
}

export interface AggregatedFields {
  applicationId: string;
  fieldMap: { [fieldName: string]: FieldEntry[] };
  conflicts: FieldConflict[];
  consensusFields: { [fieldName: string]: string };
  documentsSummary: {
    totalDocuments: number;
    documentsProcessed: number;
    fieldsExtracted: number;
    conflictsFound: number;
  };
  aggregatedAt: Date;
}

export class FieldAggregatorService {
  // Main function to aggregate OCR fields across documents
  async aggregateOCRFields(applicationId: string): Promise<AggregatedFields> {
    try {
      console.log(`[FIELD-AGGREGATOR] Starting aggregation for application ${applicationId}`);

      // Get all documents for this application
      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, applicationId));

      if (docs.length === 0) {
        return this.generateEmptyAggregation(applicationId);
      }

      // Extract fields from all documents
      const documentFields = await this.extractFieldsFromDocuments(docs);

      // Build field map
      const fieldMap = this.buildFieldMap(documentFields);

      // Detect conflicts
      const conflicts = await this.detectFieldConflicts(fieldMap);

      // Generate consensus fields
      const consensusFields = await this.generateConsensusFields(fieldMap, conflicts);

      // Calculate summary
      const documentsSummary = this.calculateSummary(docs, documentFields, conflicts);

      const aggregatedFields: AggregatedFields = {
        applicationId,
        fieldMap,
        conflicts,
        consensusFields,
        documentsSummary,
        aggregatedAt: new Date()
      };

      console.log(`[FIELD-AGGREGATOR] Completed: ${Object.keys(fieldMap).length} unique fields, ${conflicts.length} conflicts`);

      return aggregatedFields;

    } catch (error) {
      console.error('[FIELD-AGGREGATOR] Error aggregating fields:', error);
      throw error;
    }
  }

  // Extract fields from all documents
  private async extractFieldsFromDocuments(docs: any[]): Promise<{ [documentId: string]: ExtractedField[] }> {
    const documentFields: { [documentId: string]: ExtractedField[] } = {};

    for (const doc of docs) {
      try {
        // Check if insights already exist
        if (doc.metadata?.insights?.extractedFields) {
          documentFields[doc.id] = doc.metadata.insights.extractedFields;
        } else {
          // Extract insights if not available
          const insights = await documentInsightsService.extractDocumentInsights(doc.id);
          documentFields[doc.id] = insights.extractedFields;
        }
      } catch (error) {
        console.error(`[FIELD-AGGREGATOR] Failed to extract fields from document ${doc.id}:`, error);
        documentFields[doc.id] = [];
      }
    }

    return documentFields;
  }

  // Build field map grouping values by field name
  private buildFieldMap(documentFields: { [documentId: string]: ExtractedField[] }): { [fieldName: string]: FieldEntry[] } {
    const fieldMap: { [fieldName: string]: FieldEntry[] } = {};

    // Get document info for context
    const getDocumentInfo = async (documentId: string) => {
      const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      
      return doc.length > 0 ? doc[0] : null;
    };

    for (const [documentId, fields] of Object.entries(documentFields)) {
      for (const field of fields) {
        if (!fieldMap[field.label]) {
          fieldMap[field.label] = [];
        }

        // We'll need to get document info, but for now use basic info
        fieldMap[field.label].push({
          value: field.value,
          documentType: 'document', // Will be filled with actual type
          documentId,
          documentName: `Document ${documentId.slice(0, 8)}`,
          confidence: field.confidence,
          method: field.method
        });
      }
    }

    return fieldMap;
  }

  // Detect conflicts between field values
  private async detectFieldConflicts(fieldMap: { [fieldName: string]: FieldEntry[] }): Promise<FieldConflict[]> {
    const conflicts: FieldConflict[] = [];

    for (const [fieldName, entries] of Object.entries(fieldMap)) {
      if (entries.length <= 1) continue; // No conflict possible with single entry

      // Get unique values (case-insensitive, trimmed)
      const uniqueValues = this.getUniqueValues(entries);

      if (uniqueValues.length > 1) {
        // Conflict detected
        const severity = this.determineConflictSeverity(fieldName, entries);
        const recommendation = this.generateConflictRecommendation(fieldName, entries);
        const aiResolution = await this.resolveConflictWithAI(fieldName, entries);

        conflicts.push({
          fieldName,
          conflictingValues: entries,
          severity,
          recommendation,
          aiResolution
        });
      }
    }

    return conflicts;
  }

  // Get unique values from field entries
  private getUniqueValues(entries: FieldEntry[]): string[] {
    const normalizedValues = entries.map(entry => 
      entry.value.toLowerCase().trim().replace(/\s+/g, ' ')
    );
    
    return [...new Set(normalizedValues)];
  }

  // Determine conflict severity
  private determineConflictSeverity(fieldName: string, entries: FieldEntry[]): 'critical' | 'high' | 'medium' | 'low' {
    // Critical fields that must be consistent
    const criticalFields = ['Business Name', 'GST Number', 'SIN'];
    if (criticalFields.includes(fieldName)) {
      return 'critical';
    }

    // High priority fields
    const highPriorityFields = ['Business Address', 'Revenue Last Year', 'Account Number'];
    if (highPriorityFields.includes(fieldName)) {
      return 'high';
    }

    // Check confidence levels
    const avgConfidence = entries.reduce((sum, entry) => sum + entry.confidence, 0) / entries.length;
    if (avgConfidence < 0.5) {
      return 'medium';
    }

    return 'low';
  }

  // Generate recommendation for resolving conflict
  private generateConflictRecommendation(fieldName: string, entries: FieldEntry[]): string {
    switch (fieldName) {
      case 'Business Name':
        return 'Verify legal business name with incorporation documents';
      case 'Business Address':
        return 'Confirm current business address with recent utility bill or lease agreement';
      case 'GST Number':
        return 'Validate GST number with Canada Revenue Agency records';
      case 'Revenue Last Year':
        return 'Cross-reference with tax returns and financial statements';
      default:
        return `Review all source documents for ${fieldName} and determine correct value`;
    }
  }

  // Use AI to resolve conflicts intelligently
  private async resolveConflictWithAI(fieldName: string, entries: FieldEntry[]): Promise<string> {
    try {
      const conflictData = entries.map(entry => ({
        value: entry.value,
        source: entry.documentType,
        confidence: entry.confidence,
        method: entry.method
      }));

      const prompt = `Analyze these conflicting values for the field "${fieldName}" and determine the most likely correct value:

${JSON.stringify(conflictData, null, 2)}

Consider:
- Source document reliability
- Extraction confidence
- Data consistency patterns
- Business logic

Return a JSON object with:
{
  "recommendedValue": "the most likely correct value",
  "reasoning": "explanation for the choice",
  "confidence": 0.8
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a data quality expert specializing in resolving document extraction conflicts. Provide objective analysis based on evidence."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 400,
        temperature: 0.2
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return `AI Recommendation: ${result.recommendedValue || 'Unable to determine'} (Confidence: ${Math.round((result.confidence || 0) * 100)}%) - ${result.reasoning || 'No reasoning provided'}`;

    } catch (error) {
      console.error('[FIELD-AGGREGATOR] AI conflict resolution failed:', error);
      return 'AI analysis failed - manual review required';
    }
  }

  // Generate consensus fields (best values for each field)
  private async generateConsensusFields(
    fieldMap: { [fieldName: string]: FieldEntry[] },
    conflicts: FieldConflict[]
  ): Promise<{ [fieldName: string]: string }> {
    const consensusFields: { [fieldName: string]: string } = {};

    for (const [fieldName, entries] of Object.entries(fieldMap)) {
      if (entries.length === 0) continue;

      // Check if there's a conflict for this field
      const conflict = conflicts.find(c => c.fieldName === fieldName);

      if (!conflict) {
        // No conflict - use the value
        consensusFields[fieldName] = entries[0].value;
      } else {
        // Conflict exists - choose best value based on confidence and method
        const bestEntry = entries.reduce((best, current) => {
          // Prefer higher confidence
          if (current.confidence > best.confidence) return current;
          if (current.confidence < best.confidence) return best;

          // If confidence is equal, prefer AI over regex
          if (current.method === 'ai' && best.method === 'regex') return current;
          if (current.method === 'regex' && best.method === 'ai') return best;

          return best;
        });

        consensusFields[fieldName] = bestEntry.value;
      }
    }

    return consensusFields;
  }

  // Calculate summary statistics
  private calculateSummary(
    docs: any[],
    documentFields: { [documentId: string]: ExtractedField[] },
    conflicts: FieldConflict[]
  ): AggregatedFields['documentsSummary'] {
    const totalDocuments = docs.length;
    const documentsProcessed = Object.keys(documentFields).length;
    const fieldsExtracted = Object.values(documentFields)
      .reduce((total, fields) => total + fields.length, 0);
    const conflictsFound = conflicts.length;

    return {
      totalDocuments,
      documentsProcessed,
      fieldsExtracted,
      conflictsFound
    };
  }

  // Generate empty aggregation for applications with no documents
  private generateEmptyAggregation(applicationId: string): AggregatedFields {
    return {
      applicationId,
      fieldMap: {},
      conflicts: [],
      consensusFields: {},
      documentsSummary: {
        totalDocuments: 0,
        documentsProcessed: 0,
        fieldsExtracted: 0,
        conflictsFound: 0
      },
      aggregatedAt: new Date()
    };
  }

  // Get conflict summary for admin dashboard
  async getConflictSummary(applicationIds: string[]): Promise<{
    totalApplications: number;
    applicationsWithConflicts: number;
    totalConflicts: number;
    conflictsByType: { [fieldName: string]: number };
    criticalConflicts: number;
  }> {
    let totalConflicts = 0;
    let applicationsWithConflicts = 0;
    let criticalConflicts = 0;
    const conflictsByType: { [fieldName: string]: number } = {};

    for (const appId of applicationIds) {
      try {
        const aggregation = await this.aggregateOCRFields(appId);
        
        if (aggregation.conflicts.length > 0) {
          applicationsWithConflicts++;
          totalConflicts += aggregation.conflicts.length;

          for (const conflict of aggregation.conflicts) {
            conflictsByType[conflict.fieldName] = (conflictsByType[conflict.fieldName] || 0) + 1;
            
            if (conflict.severity === 'critical') {
              criticalConflicts++;
            }
          }
        }
      } catch (error) {
        console.error(`[FIELD-AGGREGATOR] Error processing application ${appId}:`, error);
      }
    }

    return {
      totalApplications: applicationIds.length,
      applicationsWithConflicts,
      totalConflicts,
      conflictsByType,
      criticalConflicts
    };
  }
}

export const fieldAggregatorService = new FieldAggregatorService();