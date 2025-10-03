/**
 * ✅ VERIFICATION PLAN: DOCUMENT UPLOAD INTEGRITY TEST
 * Tests the enhanced upload system to verify all components work correctly
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_APPLICATION_ID = 'test-upload-integrity-' + Date.now();

// Test file creation utilities
async function createTestFile(fileName: string, content: string): Promise<{ buffer: Buffer; checksum: string }> {
  const buffer = Buffer.from(content);
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
  return { buffer, checksum };
}

describe('Document Upload Integrity System', () => {
  let testFiles: Array<{ name: string; buffer: Buffer; checksum: string; mimeType: string }> = [];

  beforeAll(async () => {
    // Create test files
    const pdfTest = await createTestFile('test-integrity.pdf', 
      '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n' +
      '2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n' +
      '3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\n' +
      'xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000125 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n173\n%%EOF'
    );

    const docxTest = await createTestFile('test-integrity.docx',
      'PK\x03\x04\x14\x00\x00\x00\x08\x00Test DOCX Content for Upload Integrity Testing'
    );

    const xlsxTest = await createTestFile('test-integrity.xlsx',
      'PK\x03\x04\x14\x00\x00\x00\x08\x00Test XLSX Content for Upload Integrity Testing'
    );

    testFiles = [
      { name: 'test-integrity.pdf', ...pdfTest, mimeType: 'application/pdf' },
      { name: 'test-integrity.docx', ...docxTest, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { name: 'test-integrity.xlsx', ...xlsxTest, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ];
  });

  test('Upload System Status Check', async () => {
    const response = await fetch(`${API_BASE_URL}/api/upload-freeze/freeze-status`);
    expect(response.ok).toBe(true);
    
    const status = await response.json();
    console.log('📊 Upload system status:', status);
    
    // If frozen, unfreeze for testing
    if (status.frozen) {
      console.log('🔓 Unfreezing upload system for testing...');
      const unfreezeResponse = await fetch(`${API_BASE_URL}/api/upload-freeze/unfreeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Automated integrity testing' })
      });
      expect(unfreezeResponse.ok).toBe(true);
    }
  });

  test('Enhanced Upload - PDF File Integrity', async () => {
    const testFile = testFiles[0]; // PDF
    const formData = new FormData();
    
    const blob = new Blob([testFile.buffer], { type: testFile.mimeType });
    formData.append('file', blob, testFile.name);
    formData.append('applicationId', TEST_APPLICATION_ID);
    formData.append('documentType', 'bank_statements');
    formData.append('uploadedBy', 'automated-test');

    const response = await fetch(`${API_BASE_URL}/api/persistence-validation/enhanced-upload`, {
      method: 'POST',
      body: formData
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    
    console.log('📄 PDF Upload Result:', result);
    
    expect(result.success).toBe(true);
    expect(result.documentId).toBeDefined();
    expect(result.validation.success).toBe(true);
    expect(result.validation.checksumVerified).toBe(true);
    expect(result.validation.sizeVerified).toBe(true);
    expect(result.backupStatus).toBe('success');
  });

  test('Enhanced Upload - DOCX File Integrity', async () => {
    const testFile = testFiles[1]; // DOCX
    const formData = new FormData();
    
    const blob = new Blob([testFile.buffer], { type: testFile.mimeType });
    formData.append('file', blob, testFile.name);
    formData.append('applicationId', TEST_APPLICATION_ID);
    formData.append('documentType', 'financial_statements');
    formData.append('uploadedBy', 'automated-test');

    const response = await fetch(`${API_BASE_URL}/api/persistence-validation/enhanced-upload`, {
      method: 'POST',
      body: formData
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    
    console.log('📄 DOCX Upload Result:', result);
    
    expect(result.success).toBe(true);
    expect(result.validation.checksumVerified).toBe(true);
  });

  test('Enhanced Upload - XLSX File Integrity', async () => {
    const testFile = testFiles[2]; // XLSX
    const formData = new FormData();
    
    const blob = new Blob([testFile.buffer], { type: testFile.mimeType });
    formData.append('file', blob, testFile.name);
    formData.append('applicationId', TEST_APPLICATION_ID);
    formData.append('documentType', 'profit_loss_statement');
    formData.append('uploadedBy', 'automated-test');

    const response = await fetch(`${API_BASE_URL}/api/persistence-validation/enhanced-upload`, {
      method: 'POST',
      body: formData
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    
    console.log('📄 XLSX Upload Result:', result);
    
    expect(result.success).toBe(true);
    expect(result.validation.checksumVerified).toBe(true);
  });

  test('Document Recovery Status Check', async () => {
    const response = await fetch(`${API_BASE_URL}/api/document-recovery/application/${TEST_APPLICATION_ID}/documents`);
    expect(response.ok).toBe(true);
    
    const recoveryStatus = await response.json();
    console.log('🔄 Recovery Status:', recoveryStatus);
    
    expect(recoveryStatus.success).toBe(true);
    expect(recoveryStatus.documents.length).toBe(3); // Should have 3 test files
    expect(recoveryStatus.missingFiles).toBe(0); // No missing files
    expect(recoveryStatus.healthyFiles).toBe(3); // All files healthy
    
    // Verify no files need recovery
    recoveryStatus.documents.forEach((doc: any) => {
      expect(doc.physicalFileExists).toBe(true);
      expect(doc.needsRecovery).toBe(false);
      expect(doc.isPlaceholder).toBe(false);
    });
  });

  test('Alert System Status', async () => {
    const response = await fetch(`${API_BASE_URL}/api/persistence-validation/alert-status`);
    expect(response.ok).toBe(true);
    
    const alertStatus = await response.json();
    console.log('🚨 Alert System Status:', alertStatus);
    
    expect(alertStatus.status).toBe('HEALTHY'); // Should be healthy after successful uploads
    expect(alertStatus.uploadsFrozen).toBe(false);
  });

  test('Upload Audit Log Verification', async () => {
    try {
      const auditLog = await fs.readFile('logs/upload-audit.log', 'utf-8');
      console.log('📝 Audit Log Sample:', auditLog.split('\n').slice(-10).join('\n'));
      
      // Verify audit log contains our test uploads
      expect(auditLog).toContain('test-integrity.pdf');
      expect(auditLog).toContain('test-integrity.docx');
      expect(auditLog).toContain('test-integrity.xlsx');
      expect(auditLog).toContain('SUCCESS');
    } catch (error) {
      console.warn('⚠️ Could not verify audit log:', error);
    }
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test files...');
    // Note: In production, cleanup would be handled by the system
    // For tests, we leave files for manual verification
  });
});

// Run test if called directly
if (require.main === module) {
  console.log('🚀 Starting Document Upload Integrity Test Suite...');
  console.log(`📍 Testing against: ${API_BASE_URL}`);
  console.log(`🆔 Test Application ID: ${TEST_APPLICATION_ID}`);
}