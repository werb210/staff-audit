import { db } from '../db';
import { documents, applications } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { S3Storage } from '../utils/s3';
import { ocrService } from './ocr';
import { z } from 'zod';

const s3Storage = new S3Storage();

// Document upload validation schema
export const documentUploadSchema = z.object({
  applicationId: z.string().uuid("Valid application ID required"),
  fileName: z.string().min(1, "File name is required"),
  documentType: z.enum([
    'bank_statements',
    'financial_statements', 
    'tax_returns',
    'business_license',
    'articles_of_incorporation',
    'account_prepared_financials',
    'pnl_statement',
    'application_summary_pdf',
    'other'
  ], { required_error: "Valid document type required" }),
  fileSize: z.number().max(10 * 1024 * 1024, "File size must be under 10MB"),
  mimeType: z.string().min(1, "MIME type is required"),
});

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

export class DocumentsService {
  async uploadDocument(
    applicationId: string,
    fileBuffer: Buffer,
    metadata: {
      fileName: string;
      documentType: string;
      fileSize: number;
      mimeType: string;
    }
  ) {
    try {
      console.log('📎 [DOCUMENTS] Uploading document:', {
        applicationId,
        fileName: metadata.fileName,
        documentType: metadata.documentType,
        fileSize: metadata.fileSize
      });

      // Validate input
      const validatedData = documentUploadSchema.parse({
        applicationId,
        ...metadata
      });

      // Verify application exists
      const [application] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, applicationId));

      if (!application) {
        throw new Error('Application not found');
      }

      // Upload to S3
      const storageKey = await s3Storage.set(fileBuffer, metadata.fileName, applicationId);
      const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME || 'boreal-documents'}.s3.${process.env.AWS_REGION || 'ca-central-1'}.amazonaws.com/${storageKey}`;

      // Save document metadata to database
      const [newDocument] = await db.insert(documents).values({
        applicationId,
        fileName: metadata.fileName,
        fileType: metadata.mimeType,
        fileSize: metadata.fileSize,
        documentType: metadata.documentType as any,
        filePath: s3Url,
        storageKey,
        status: 'pending',
        uploadedBy: 'system', // Could be user ID in the future
        isRequired: false,
        isVerified: false,
        mimeType: metadata.mimeType,
        fileExists: true
      }).returning();

      console.log('✅ [DOCUMENTS] Document uploaded successfully:', newDocument.id);

      // Trigger AI-powered OCR processing asynchronously
      this.processDocumentOCR(newDocument.id, fileBuffer, metadata.documentType, applicationId).catch(error => {
        console.error('⚠️ [DOCUMENTS] AI OCR processing failed:', error);
      });

      return {
        document_id: newDocument.id,
        s3_url: s3Url,
        ocr_status: 'pending'
      };
    } catch (error) {
      console.error('❌ [DOCUMENTS] Document upload failed:', error);
      throw error;
    }
  }

  async getDocuments(applicationId: string) {
    try {
      const documentList = await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, applicationId));

      return documentList;
    } catch (error) {
      console.error('❌ [DOCUMENTS] Failed to get documents:', error);
      throw error;
    }
  }

  private async processDocumentOCR(documentId: string, fileBuffer: Buffer, documentType: string, applicationId?: string) {
    try {
      console.log('🔍 [DOCUMENTS] Starting AI-powered OCR processing for document:', documentId);

      // Process with AI-enhanced OCR service
      const ocrResults = await ocrService.processDocument(fileBuffer, documentType);

      // Save OCR and AI results to database if applicationId is provided
      if (applicationId) {
        await ocrService.saveOCRResults(applicationId, documentId, ocrResults);
        console.log('💾 [DOCUMENTS] AI results saved to database for application:', applicationId);
      }

      // Update document status to completed
      await db
        .update(documents)
        .set({
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId));

      console.log('✅ [DOCUMENTS] AI OCR processing and database storage completed for document:', documentId);

      return ocrResults;
    } catch (error) {
      console.error('❌ [DOCUMENTS] AI OCR processing failed for document:', documentId, error);
      
      // Update document status to failed
      await db
        .update(documents)
        .set({
          status: 'failed',
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId));

      throw error;
    }
  }

  async updateDocumentStatus(documentId: string, status: 'pending' | 'processing' | 'completed' | 'failed') {
    try {
      const [updatedDocument] = await db
        .update(documents)
        .set({ status, updatedAt: new Date() })
        .where(eq(documents.id, documentId))
        .returning();

      return updatedDocument;
    } catch (error) {
      console.error('❌ [DOCUMENTS] Failed to update document status:', error);
      throw error;
    }
  }
}

export const documentsService = new DocumentsService();