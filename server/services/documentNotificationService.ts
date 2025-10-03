import { db } from '../db';
import { documents, applications } from '../../shared/schema';
import { eq } from 'drizzle-orm';

interface DocumentSubmission {
  documentId: string;
  applicationId: string;
  businessName: string;
  fileName: string;
  documentType: string;
  fileSize: number;
  uploadedAt: string;
  clientIP?: string;
  userAgent?: string;
}

/**
 * Real-time document submission monitoring service
 */
export class DocumentNotificationService {
  private static lastCheckTime: Date = new Date();
  private static isMonitoring: boolean = false;

  /**
   * Start monitoring for new document submissions
   */
  static async startMonitoring(callback: (submission: DocumentSubmission) => void) {
    if (this.isMonitoring) {
      console.log('📊 [DOCUMENT MONITOR] Already monitoring for new submissions');
      return;
    }

    this.isMonitoring = true;
    this.lastCheckTime = new Date();
    
    console.log('📊 [DOCUMENT MONITOR] Starting real-time monitoring for new document submissions');

    // Check every 30 seconds for new submissions
    const monitorInterval = setInterval(async () => {
      try {
        const newSubmissions = await this.checkForNewSubmissions();
        
        if (newSubmissions.length > 0) {
          console.log(`📊 [DOCUMENT MONITOR] Found ${newSubmissions.length} new document submission(s)`);
          
          for (const submission of newSubmissions) {
            callback(submission);
          }
          
          // Update last check time
          this.lastCheckTime = new Date();
        }
      } catch (error) {
        console.error('❌ [DOCUMENT MONITOR] Error checking for new submissions:', error);
      }
    }, 30000); // Check every 30 seconds

    // Store interval ID for cleanup if needed
    (global as any).documentMonitorInterval = monitorInterval;
  }

  /**
   * Check for new document submissions since last check
   */
  private static async checkForNewSubmissions(): Promise<DocumentSubmission[]> {
    try {
      // Query for documents created since last check
      const query = `
        SELECT 
          d.id as document_id,
          d.application_id,
          d.file_name,
          d.document_type,
          d.file_size,
          d.created_at,
          'Unknown Business' as business_name,
          a.id as app_id
        FROM documents d
        JOIN applications a ON d.application_id = a.id
        WHERE d.created_at > $1
        ORDER BY d.created_at DESC
      `;

      const { pool } = await import('../db');
      const result = await pool.query(query, [this.lastCheckTime.toISOString()]);

      const submissions: DocumentSubmission[] = result.rows.map(row => ({
        documentId: row.document_id,
        applicationId: row.application_id,
        businessName: row.business_name || 'Unknown Business',
        fileName: row.file_name,
        documentType: row.document_type,
        fileSize: row.file_size,
        uploadedAt: row.created_at
      }));

      return submissions;
    } catch (error) {
      console.error('❌ [DOCUMENT MONITOR] Database query failed:', error);
      return [];
    }
  }

  /**
   * Stop monitoring for new submissions
   */
  static stopMonitoring() {
    if ((global as any).documentMonitorInterval) {
      clearInterval((global as any).documentMonitorInterval);
      delete (global as any).documentMonitorInterval;
    }
    
    this.isMonitoring = false;
    console.log('📊 [DOCUMENT MONITOR] Stopped monitoring for new submissions');
  }

  /**
   * Get monitoring status
   */
  static getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastCheckTime: this.lastCheckTime,
      checkInterval: '30 seconds'
    };
  }

  /**
   * Format submission notification for console output
   */
  static formatSubmissionNotification(submission: DocumentSubmission): string {
    const timestamp = new Date(submission.uploadedAt).toLocaleString();
    const sizeKB = Math.round(submission.fileSize / 1024);
    
    return `
🚨 NEW DOCUMENT SUBMISSION DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 FILE: ${submission.fileName}
🏢 BUSINESS: ${submission.businessName}
📋 TYPE: ${submission.documentType}
📊 SIZE: ${sizeKB} KB
⏰ TIME: ${timestamp}
🆔 APPLICATION: ${submission.applicationId}
🔗 DOCUMENT ID: ${submission.documentId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
}

/**
 * Enhanced notification callback with detailed logging
 */
export function documentSubmissionCallback(submission: DocumentSubmission) {
  // Log detailed notification
  console.log(DocumentNotificationService.formatSubmissionNotification(submission));
  
  // Also log JSON format for any automated processing
  console.log('📊 [DOCUMENT MONITOR] JSON Data:', JSON.stringify(submission, null, 2));
  
  // Add timestamp for tracking
  console.log(`📊 [DOCUMENT MONITOR] Notification sent at: ${new Date().toISOString()}`);
}