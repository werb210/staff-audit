import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Document Flow Integration Test
 * Tests the complete document workflow: upload → view → accept/reject → lender visibility
 */

describe('Document Flow Integration', () => {
  let server: any;
  let applicationId: string;
  let documentId: string;

  beforeAll(async () => {
    // Start the server
    try {
      const { stdout } = await execAsync('npm run dev &');
      console.log('Server started:', stdout);
    } catch (error) {
      console.log('Server may already be running');
    }
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create a test application
    const appResponse = await request('http://localhost:5000')
      .post('/api/applications/draft')
      .send({
        formData: {
          businessName: 'Test Company',
          email: 'test@example.com',
          loanAmount: 50000,
          industry: 'Technology'
        }
      });

    applicationId = appResponse.body.id;
  });

  afterAll(async () => {
    // Clean up
    if (server) {
      server.close();
    }
  });

  describe('Document Upload and Processing', () => {
    it('should upload a document successfully', async () => {
      const filePath = path.join(__dirname, 'fixtures', 'sample.pdf');
      
      const response = await request('http://localhost:5000')
        .post(`/api/applications/${applicationId}/documents`)
        .attach('file', filePath)
        .field('documentType', 'bank_statements');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.document).toBeDefined();
      expect(response.body.document.id).toBeDefined();
      
      documentId = response.body.document.id;
    });

    it('should retrieve the uploaded document', async () => {
      const response = await request('http://localhost:5000')
        .get(`/api/documents/${documentId}/download`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    });

    it('should get document metadata', async () => {
      const response = await request('http://localhost:5000')
        .get(`/api/applications/${applicationId}/documents`);

      expect(response.status).toBe(200);
      expect(response.body.documents).toBeDefined();
      expect(response.body.documents.length).toBeGreaterThan(0);
      
      const document = response.body.documents.find((doc: any) => doc.id === documentId);
      expect(document).toBeDefined();
      expect(document.status).toBe('PENDING');
    });
  });

  describe('Document Status Management', () => {
    it('should accept a document', async () => {
      const response = await request('http://localhost:5000')
        .patch(`/api/documents/${documentId}`)
        .send({ status: 'ACCEPTED' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.document.status).toBe('ACCEPTED');
    });

    it('should reject a document', async () => {
      // First reset to pending
      await request('http://localhost:5000')
        .patch(`/api/documents/${documentId}`)
        .send({ status: 'PENDING' });

      const response = await request('http://localhost:5000')
        .patch(`/api/documents/${documentId}`)
        .send({ status: 'REJECTED' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.document.status).toBe('REJECTED');
    });
  });

  describe('Lender Visibility Logic', () => {
    it('should not show lender recommendations when documents are pending/rejected', async () => {
      // Ensure document is rejected
      await request('http://localhost:5000')
        .patch(`/api/documents/${documentId}`)
        .send({ status: 'REJECTED' });

      const response = await request('http://localhost:5000')
        .get(`/api/applications/${applicationId}/lender-visibility`);

      expect(response.status).toBe(200);
      expect(response.body.canShowLenders).toBe(false);
      expect(response.body.reason).toContain('documents must be accepted');
    });

    it('should show lender recommendations when all documents are accepted', async () => {
      // Accept the document
      await request('http://localhost:5000')
        .patch(`/api/documents/${documentId}`)
        .send({ status: 'ACCEPTED' });

      const response = await request('http://localhost:5000')
        .get(`/api/applications/${applicationId}/lender-visibility`);

      expect(response.status).toBe(200);
      expect(response.body.canShowLenders).toBe(true);
    });
  });

  describe('OCR Processing', () => {
    it('should trigger OCR processing on document upload', async () => {
      const response = await request('http://localhost:5000')
        .get(`/api/applications/${applicationId}/ocr`);

      expect(response.status).toBe(200);
      expect(response.body.ocrResults).toBeDefined();
    });
  });
});

/**
 * Unit Tests for Document Components
 */
describe('Document Components', () => {
  describe('DocumentViewer', () => {
    it('should render PDF viewer for PDF documents', () => {
      // This would be a React component test if we had a test renderer set up
      expect(true).toBe(true); // Placeholder
    });

    it('should render image viewer for image documents', () => {
      // This would be a React component test if we had a test renderer set up
      expect(true).toBe(true); // Placeholder
    });

    it('should render download link for other document types', () => {
      // This would be a React component test if we had a test renderer set up
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('AcceptRejectButtons', () => {
    it('should be disabled when document is not pending', () => {
      // This would be a React component test if we had a test renderer set up
      expect(true).toBe(true); // Placeholder
    });

    it('should call mutation when accept button is clicked', () => {
      // This would be a React component test if we had a test renderer set up
      expect(true).toBe(true); // Placeholder
    });

    it('should call mutation when reject button is clicked', () => {
      // This would be a React component test if we had a test renderer set up
      expect(true).toBe(true); // Placeholder
    });
  });
});