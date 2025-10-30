import { db } from '../../db';
import { applications } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { fieldAggregatorService } from './aggregateFields';
export class ConflictCheckerService {
    // Main function to detect field mismatches between app data and OCR
    async detectFieldMismatches(applicationId) {
        try {
            console.log(`[CONFLICT-CHECKER] Detecting field mismatches for application ${applicationId}`);
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
            // Get aggregated OCR fields
            const aggregatedFields = await fieldAggregatorService.aggregateOCRFields(applicationId);
            // Perform field-by-field comparison
            const fieldMismatches = this.compareApplicationToOCR(application, aggregatedFields);
            // Calculate overall risk
            const overallRisk = this.calculateOverallRisk(fieldMismatches);
            // Generate recommendations
            const recommendations = this.generateRecommendations(fieldMismatches);
            // Get checked fields list
            const checkedFields = this.getCheckedFields(application, aggregatedFields);
            const report = {
                applicationId,
                totalMismatches: fieldMismatches.length,
                criticalMismatches: fieldMismatches.filter(m => m.severity === 'critical').length,
                fieldMismatches,
                overallRisk,
                recommendations,
                checkedFields,
                checkedAt: new Date()
            };
            console.log(`[CONFLICT-CHECKER] Found ${fieldMismatches.length} mismatches (${report.criticalMismatches} critical)`);
            return report;
        }
        catch (error) {
            console.error('[CONFLICT-CHECKER] Error detecting field mismatches:', error);
            throw error;
        }
    }
    // Compare application fields to aggregated OCR data
    compareApplicationToOCR(application, aggregatedFields) {
        const mismatches = [];
        const consensusFields = aggregatedFields.consensusFields || {};
        // Define field mappings between application and OCR fields
        const fieldMappings = [
            {
                appField: 'legalBusinessName',
                ocrField: 'Business Name',
                severity: 'critical',
                displayName: 'Business Name'
            },
            {
                appField: 'businessAddress',
                ocrField: 'Business Address',
                severity: 'high',
                displayName: 'Business Address'
            },
            {
                appField: 'monthlyRevenue',
                ocrField: 'Monthly Revenue',
                severity: 'medium',
                displayName: 'Monthly Revenue',
                isNumeric: true
            },
            {
                appField: 'gstNumber',
                ocrField: 'GST Number',
                severity: 'high',
                displayName: 'GST Number'
            },
            {
                appField: 'industry',
                ocrField: 'Industry Code',
                severity: 'low',
                displayName: 'Industry'
            }
        ];
        // Check each field mapping
        for (const mapping of fieldMappings) {
            const appValue = application[mapping.appField];
            const ocrValue = consensusFields[mapping.ocrField];
            // Skip if either value is missing
            if (!appValue || !ocrValue)
                continue;
            // Perform comparison based on field type
            const isMismatch = mapping.isNumeric
                ? this.compareNumericValues(appValue, ocrValue)
                : this.compareStringValues(String(appValue), String(ocrValue));
            if (isMismatch) {
                // Find source document for this OCR value
                const source = this.findFieldSource(mapping.ocrField, aggregatedFields);
                mismatches.push({
                    fieldName: mapping.displayName,
                    applicationValue: appValue,
                    ocrValue: String(ocrValue),
                    source: source.documentName,
                    confidence: source.confidence,
                    severity: mapping.severity,
                    recommendation: this.generateFieldRecommendation(mapping.displayName, mapping.severity)
                });
            }
        }
        return mismatches;
    }
    // Compare string values with normalization and fuzzy matching
    compareStringValues(appValue, ocrValue) {
        const normalize = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');
        const normalizedApp = normalize(appValue);
        const normalizedOCR = normalize(ocrValue);
        // Exact match
        if (normalizedApp === normalizedOCR)
            return false;
        // Calculate similarity ratio
        const similarity = this.calculateSimilarity(normalizedApp, normalizedOCR);
        // Consider it a mismatch if similarity is below 85%
        return similarity < 0.85;
    }
    // Compare numeric values with tolerance
    compareNumericValues(appValue, ocrValue) {
        const appNum = parseFloat(String(appValue).replace(/[^0-9.-]/g, ''));
        const ocrNum = parseFloat(ocrValue.replace(/[^0-9.-]/g, ''));
        if (isNaN(appNum) || isNaN(ocrNum))
            return true; // Mismatch if can't parse
        // Allow 10% tolerance for numeric values
        const tolerance = Math.max(appNum * 0.1, 100); // At least $100 tolerance
        return Math.abs(appNum - ocrNum) > tolerance;
    }
    // Calculate string similarity using simple algorithm
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0)
            return 1.0;
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    // Levenshtein distance calculation
    levenshteinDistance(str1, str2) {
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
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    // Find the source document for a specific field
    findFieldSource(fieldName, aggregatedFields) {
        const fieldMap = aggregatedFields.fieldMap || {};
        const fieldEntries = fieldMap[fieldName] || [];
        if (fieldEntries.length > 0) {
            // Return the highest confidence source
            const bestEntry = fieldEntries.reduce((best, current) => current.confidence > best.confidence ? current : best);
            return {
                documentName: bestEntry.documentName || 'Unknown Document',
                confidence: bestEntry.confidence || 0.5
            };
        }
        return {
            documentName: 'Unknown Source',
            confidence: 0.3
        };
    }
    // Generate field-specific recommendation
    generateFieldRecommendation(fieldName, severity) {
        const baseRecommendations = {
            'Business Name': 'Verify legal business name with incorporation documents',
            'Business Address': 'Confirm current business address with utility bill or lease',
            'GST Number': 'Validate GST number with Canada Revenue Agency',
            'Monthly Revenue': 'Reconcile revenue figures with financial statements',
            'Industry': 'Verify industry classification with business registration'
        };
        const base = baseRecommendations[fieldName] || `Verify ${fieldName} information`;
        if (severity === 'critical') {
            return `URGENT: ${base} - this discrepancy requires immediate resolution`;
        }
        else if (severity === 'high') {
            return `HIGH PRIORITY: ${base}`;
        }
        return base;
    }
    // Calculate overall risk level
    calculateOverallRisk(mismatches) {
        const criticalCount = mismatches.filter(m => m.severity === 'critical').length;
        const highCount = mismatches.filter(m => m.severity === 'high').length;
        if (criticalCount > 0)
            return 'critical';
        if (highCount >= 2)
            return 'high';
        if (highCount >= 1 || mismatches.length >= 3)
            return 'medium';
        return 'low';
    }
    // Generate overall recommendations
    generateRecommendations(mismatches) {
        const recommendations = [];
        if (mismatches.length === 0) {
            recommendations.push('No significant field conflicts detected');
            return recommendations;
        }
        // Critical mismatch recommendations
        const criticalMismatches = mismatches.filter(m => m.severity === 'critical');
        if (criticalMismatches.length > 0) {
            recommendations.push('CRITICAL: Resolve all critical field discrepancies before proceeding');
        }
        // High priority recommendations
        const highMismatches = mismatches.filter(m => m.severity === 'high');
        if (highMismatches.length > 0) {
            recommendations.push('Request additional documentation to resolve high-priority conflicts');
        }
        // Multiple conflicts
        if (mismatches.length >= 3) {
            recommendations.push('Multiple field conflicts detected - conduct thorough document review');
        }
        // Low confidence OCR
        const lowConfidenceMismatches = mismatches.filter(m => m.confidence < 0.6);
        if (lowConfidenceMismatches.length > 0) {
            recommendations.push('Some conflicts involve low-confidence OCR - manual verification recommended');
        }
        // General recommendation
        recommendations.push('Verify all flagged fields with original source documents');
        return recommendations;
    }
    // Get list of fields that were checked
    getCheckedFields(application, aggregatedFields) {
        const checkedFields = [];
        const consensusFields = aggregatedFields.consensusFields || {};
        const fieldMappings = [
            { appField: 'legalBusinessName', ocrField: 'Business Name' },
            { appField: 'businessAddress', ocrField: 'Business Address' },
            { appField: 'monthlyRevenue', ocrField: 'Monthly Revenue' },
            { appField: 'gstNumber', ocrField: 'GST Number' },
            { appField: 'industry', ocrField: 'Industry Code' }
        ];
        for (const mapping of fieldMappings) {
            const appValue = application[mapping.appField];
            const ocrValue = consensusFields[mapping.ocrField];
            if (appValue && ocrValue) {
                checkedFields.push(mapping.ocrField);
            }
        }
        return checkedFields;
    }
    // Batch check multiple applications
    async batchCheckConflicts(applicationIds) {
        const reports = [];
        let totalMismatches = 0;
        let criticalMismatches = 0;
        let applicationsWithConflicts = 0;
        for (const appId of applicationIds) {
            try {
                const report = await this.detectFieldMismatches(appId);
                reports.push(report);
                totalMismatches += report.totalMismatches;
                criticalMismatches += report.criticalMismatches;
                if (report.totalMismatches > 0) {
                    applicationsWithConflicts++;
                }
            }
            catch (error) {
                console.error(`[CONFLICT-CHECKER] Error checking application ${appId}:`, error);
            }
        }
        return {
            reports,
            summary: {
                totalApplications: applicationIds.length,
                applicationsWithConflicts,
                totalMismatches,
                criticalMismatches
            }
        };
    }
}
export const conflictCheckerService = new ConflictCheckerService();
