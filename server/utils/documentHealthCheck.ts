import { db } from '../db.js';
import { documents, documentRecoveryLog } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Phase 3 Feature 6: Document Health Monitoring System
 * Predictive failure detection and health dashboard
 */

export interface DocumentHealthStatus {
  documentId: string;
  missingDisk: boolean;
  missingStorage: boolean;
  sha256Mismatch: boolean;
  lastChecked: Date;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface HealthReport {
  totalDocuments: number;
  healthyDocuments: number;
  atRiskDocuments: number;
  failedDocuments: number;
  details: DocumentHealthStatus[];
  generatedAt: Date;
}

/**
 * Validate document checksum integrity
 */
export async function validateDocumentChecksum(filePath: string, expectedSha256: string): Promise<boolean> {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const buffer = fs.readFileSync(filePath);
    const actualSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    
    return actualSha256 === expectedSha256;
  } catch (error: unknown) {
    console.error(`❌ [HEALTH] Checksum validation failed for ${filePath}:`, error);
    return false;
  }
}

/**
 * Check if document exists on disk
 */
export function checkDiskExistence(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch (error: unknown) {
    console.error(`❌ [HEALTH] Disk check failed for ${filePath}:`, error);
    return false;
  }
}

/**
 * Check if document exists in cloud storage (placeholder - would integrate with actual storage)
 */
export async function checkStorageExistence(storageKey: string): Promise<boolean> {
  try {
    // This would integrate with actual object storage service
    // For now, we'll assume storage exists if we have a storage key
    return !!storageKey;
  } catch (error: unknown) {
    console.error(`❌ [HEALTH] Storage check failed for ${storageKey}:`, error);
    return false;
  }
}

/**
 * Determine risk level based on health status
 */
export function calculateRiskLevel(status: Omit<DocumentHealthStatus, 'riskLevel'>): 'low' | 'medium' | 'high' {
  if (status.missingDisk && status.missingStorage) {
    return 'high'; // Complete data loss
  }
  
  if (status.missingDisk || status.missingStorage || status.sha256Mismatch) {
    return 'medium'; // Partial issues
  }
  
  return 'low'; // All checks passed
}

/**
 * Run comprehensive health check on all documents
 */
export async function runDocumentHealthCheck(): Promise<HealthReport> {
  console.log('🏥 [HEALTH] Starting comprehensive document health check');
  
  try {
    const allDocuments = await db.select().from(documents);
    
    const healthStatuses: DocumentHealthStatus[] = [];
    let healthyCount = 0;
    let atRiskCount = 0;
    let failedCount = 0;
    
    for (const document of allDocuments) {
      const filePath = document.filePath ? path.join(process.cwd(), 'uploads', 'documents', path.basename(document.filePath)) : null;
      const storageKey = document.storageKey;
      const expectedSha256 = document.sha256;
      
      // Check disk existence
      const missingDisk = !filePath || !checkDiskExistence(filePath);
      
      // Check storage existence
      const missingStorage = !await checkStorageExistence(storageKey);
      
      // Check SHA256 integrity (only if file exists on disk and we have expected checksum)
      let sha256Mismatch = false;
      if (!missingDisk && filePath && expectedSha256) {
        sha256Mismatch = !await validateDocumentChecksum(filePath, expectedSha256);
      }
      
      const status: DocumentHealthStatus = {
        documentId: document.id,
        missingDisk,
        missingStorage,
        sha256Mismatch,
        lastChecked: new Date(),
        riskLevel: 'low' // Will be calculated next
      };
      
      // Calculate risk level
      status.riskLevel = calculateRiskLevel(status);
      
      // Update counters
      switch (status.riskLevel) {
        case 'low':
          healthyCount++;
          break;
        case 'medium':
          atRiskCount++;
          break;
        case 'high':
          failedCount++;
          break;
      }
      
      healthStatuses.push(status);
      
      // Log recovery event for problematic documents
      if (status.riskLevel !== 'low') {
        await logHealthEvent(document.id, status);
      }
    }
    
    const report: HealthReport = {
      totalDocuments: allDocuments.length,
      healthyDocuments: healthyCount,
      atRiskDocuments: atRiskCount,
      failedDocuments: failedCount,
      details: healthStatuses,
      generatedAt: new Date()
    };
    
    console.log(`🏥 [HEALTH] Health check complete: ${healthyCount} healthy, ${atRiskCount} at risk, ${failedCount} failed`);
    
    return report;
    
  } catch (error: unknown) {
    console.error('❌ [HEALTH] Health check failed:', error);
    throw new Error(`Health check failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`);
  }
}

/**
 * Log health-related recovery events
 */
export async function logHealthEvent(documentId: string, status: DocumentHealthStatus): Promise<void> {
  try {
    const eventType = status.riskLevel === 'high' ? 'critical_failure' : 'health_warning';
    
    const notes = [
      status.missingDisk ? 'Missing from disk' : null,
      status.missingStorage ? 'Missing from storage' : null,
      status.sha256Mismatch ? 'Checksum mismatch' : null
    ].filter(Boolean).join(', ');
    
    await db.insert(documentRecoveryLog).values({
      document_id: documentId,
      event_type: eventType as any,
      timestamp: new Date(),
      user_id: null, // System-generated event
      notes: `Health check detected: ${notes}`,
      previous_status: 'unknown',
      new_status: status.riskLevel
    });
    
  } catch (error: unknown) {
    console.error(`❌ [HEALTH] Failed to log health event for document ${documentId}:`, error);
  }
}

/**
 * Get health status for specific application
 */
export async function getApplicationHealthStatus(applicationId: string): Promise<{
  applicationId: string;
  totalDocuments: number;
  healthyDocuments: number;
  atRiskDocuments: number;
  failedDocuments: number;
  documents: DocumentHealthStatus[];
}> {
  try {
    // Get documents for this application
    const applicationDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId));
    
    const healthStatuses: DocumentHealthStatus[] = [];
    let healthyCount = 0;
    let atRiskCount = 0;
    let failedCount = 0;
    
    for (const document of applicationDocuments) {
      const filePath = document.filePath ? path.join(process.cwd(), 'uploads', 'documents', path.basename(document.filePath)) : null;
      const storageKey = document.storageKey;
      const expectedSha256 = document.sha256;
      
      const missingDisk = !filePath || !checkDiskExistence(filePath);
      const missingStorage = !await checkStorageExistence(storageKey);
      
      let sha256Mismatch = false;
      if (!missingDisk && filePath && expectedSha256) {
        sha256Mismatch = !await validateDocumentChecksum(filePath, expectedSha256);
      }
      
      const status: DocumentHealthStatus = {
        documentId: document.id,
        missingDisk,
        missingStorage,
        sha256Mismatch,
        lastChecked: new Date(),
        riskLevel: calculateRiskLevel({ documentId: document.id, missingDisk, missingStorage, sha256Mismatch, lastChecked: new Date() })
      };
      
      healthStatuses.push(status);
      
      switch (status.riskLevel) {
        case 'low': healthyCount++; break;
        case 'medium': atRiskCount++; break;
        case 'high': failedCount++; break;
      }
    }
    
    return {
      applicationId,
      totalDocuments: applicationDocuments.length,
      healthyDocuments: healthyCount,
      atRiskDocuments: atRiskCount,
      failedDocuments: failedCount,
      documents: healthStatuses
    };
    
  } catch (error: unknown) {
    console.error(`❌ [HEALTH] Application health check failed for ${applicationId}:`, error);
    throw new Error(`Application health check failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`);
  }
}

/**
 * Export health report to CSV format
 */
export function exportHealthReportToCSV(healthStatuses: DocumentHealthStatus[]): string {
  const headers = ['Document ID', 'Missing Disk', 'Missing Storage', 'SHA256 Mismatch', 'Risk Level', 'Last Checked'];
  
  const rows = healthStatuses.map(status => [
    status.documentId,
    status.missingDisk ? 'Yes' : 'No',
    status.missingStorage ? 'Yes' : 'No',
    status.sha256Mismatch ? 'Yes' : 'No',
    status.riskLevel.toUpperCase(),
    status.lastChecked.toISOString()
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
}