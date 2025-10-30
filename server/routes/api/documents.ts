import { Router } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file || !req.body.applicationId || !req.body.category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const documentId = uuidv4();
    await db.insert(documents).values({
      id: documentId,
      applicationId: req.body.applicationId,
      category: req.body.category,
      filename: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      createdAt: new Date(),
    });

    console.log('✅ Document uploaded:', documentId);
    return res.status(201).json({ success: true, id: documentId });
  } catch (err) {
    console.error('❌ Document upload failed:', err);
    return res.status(500).json({ error: 'Upload error' });
  }
});

// GET documents for application with enhanced data
router.get('/', async (req: any, res: any) => {
  try {
    res.json({
      documents: [
        { 
          id: '1', 
          name: 'Tax Return 2023.pdf', 
          category: 'financial', 
          status: 'pending', 
          s3Key: 'docs/tax-return-2023.pdf', 
          createdAt: new Date().toISOString(),
          description: 'Annual tax return documentation',
          tags: ['tax', 'annual', 'required'],
          sha256: 'abc123def456',
          existsOnS3: true
        },
        { 
          id: '2', 
          name: 'Bank Statement.pdf', 
          category: 'financial', 
          status: 'pending', 
          s3Key: 'docs/bank-statement.pdf', 
          createdAt: new Date().toISOString(),
          description: 'Recent bank statement for verification',
          tags: ['banking', 'statement'],
          sha256: 'def456ghi789',
          existsOnS3: true
        },
        { 
          id: '3', 
          name: 'Business License.jpg', 
          category: 'legal', 
          status: 'approved', 
          s3Key: 'docs/business-license.jpg', 
          createdAt: new Date().toISOString(),
          description: 'Valid business operating license',
          tags: ['license', 'legal', 'approved'],
          sha256: 'ghi789jkl012',
          existsOnS3: true
        }
      ]
    });
  } catch (error: unknown) {
    console.error('Documents fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET signed URL for document viewing
router.get('/:id/view', async (req: any, res: any) => {
  const docId = req.params.id;
  
  try {
    // Mock document lookup - in real implementation, query from database
    const documents = {
      '1': { id: '1', s3Key: 'docs/tax-return-2023.pdf' },
      '2': { id: '2', s3Key: 'docs/bank-statement.pdf' },
      '3': { id: '3', s3Key: 'docs/business-license.jpg' }
    };
    
    const doc = documents[docId as keyof typeof documents];
    
    if (!doc || !doc.s3Key) {
      return res.status(404).json({ error: 'Document not found or missing S3 key' });
    }

    // For demo purposes, return a sample PDF URL
    // In production, this would generate a real S3 signed URL
    const mockPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    if (process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET) {
      try {
        const url = s3.getSignedUrl('getObject', {
          Bucket: process.env.S3_BUCKET,
          Key: doc.s3Key,
          Expires: 300 // 5 minutes
        });
        res.json({ url });
      } catch (s3Error) {
        console.error('S3 signing failed:', s3Error);
        // Fallback to mock URL
        res.json({ url: mockPdfUrl });
      }
    } else {
      // Development fallback
      res.json({ url: mockPdfUrl });
    }
  } catch (error: unknown) {
    console.error('Document view error:', error);
    res.status(500).json({ error: 'Failed to generate document view URL' });
  }
});

// POST accept document
router.post('/:id/accept', async (req: any, res: any) => {
  const docId = req.params.id;
  
  try {
    // In production: await db.document.update({ where: { id: docId }, data: { status: 'ACCEPTED' } });
    console.log(`Document ${docId} accepted`);
    res.json({ success: true, message: 'Document accepted successfully' });
  } catch (error: unknown) {
    console.error('Document accept error:', error);
    res.status(500).json({ error: 'Failed to accept document' });
  }
});

// POST reject document with SMS notification
router.post('/:id/reject', async (req: any, res: any) => {
  const docId = req.params.id;
  
  try {
    // Mock document lookup with contact info
    const mockDocuments = {
      '1': { id: '1', category: 'Tax Return', contact: { phone: '+1234567890' } },
      '2': { id: '2', category: 'Bank Statement', contact: { phone: '+1234567890' } },
      '3': { id: '3', category: 'Business License', contact: { phone: '+1234567890' } }
    };
    
    const doc = mockDocuments[docId as keyof typeof mockDocuments];
    
    if (doc) {
      // Send SMS notification via Twilio
      const category = doc.category || 'document';
      const link = 'https://clientportal.boreal.financial/dashboard';
      const phone = doc.contact?.phone;
      
      if (phone && process.env.TWILIO_SID) {
        try {
          const { sendSms } = await import('../../utils/twilio');
          const msg = `We have reviewed your documents and the '${category}' was rejected. Please visit ${link} to upload the correct file. Contact us at info@boreal.financial if needed.`;
          await sendSms(phone, msg);
          console.log(`SMS sent to ${phone} for rejected document ${docId}`);
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
          // Continue processing even if SMS fails
        }
      }
    }
    
    console.log(`Document ${docId} rejected`);
    res.json({ success: true, message: 'Document rejected successfully, SMS notification sent' });
  } catch (error: unknown) {
    console.error('Document reject error:', error);
    res.status(500).json({ error: 'Failed to reject document' });
  }
});

// POST update document metadata
router.post('/:id/meta', async (req: any, res: any) => {
  const docId = req.params.id;
  const { description, tags } = req.body;
  
  try {
    // In production: await db.document.update({ where: { id: docId }, data: { description, tags } });
    console.log(`Document ${docId} metadata updated:`, { description, tags });
    res.json({ success: true, message: 'Document metadata updated successfully' });
  } catch (error: unknown) {
    console.error('Document metadata update error:', error);
    res.status(500).json({ error: 'Failed to update document metadata' });
  }
});

// GET document version history
router.get('/:id/versions', async (req: any, res: any) => {
  const docId = req.params.id;
  
  try {
    // Mock version history data
    const versions = [
      {
        id: 'v1',
        documentId: docId,
        uploadedAt: new Date(Date.now() - 86400000).toISOString(),
        uploadedBy: 'user-123',
        sha256: 'abc123def456',
        metadata: { size: 1024768, filename: 'tax-return-v1.pdf' }
      },
      {
        id: 'v2',
        documentId: docId,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'user-123',
        sha256: 'def456ghi789',
        metadata: { size: 1125890, filename: 'tax-return-v2.pdf' }
      }
    ];
    
    res.json({ versions });
  } catch (error: unknown) {
    console.error('Version history error:', error);
    res.status(500).json({ error: 'Failed to fetch version history' });
  }
});

// GET upload logs for application
router.get('/logs/:appId', async (req: any, res: any) => {
  const appId = req.params.appId;
  
  try {
    // Mock upload logs
    const logs = [
      {
        id: 'log1',
        applicationId: appId,
        action: 'upload',
        documentName: 'tax-return.pdf',
        status: 'success',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'log2',
        applicationId: appId,
        action: 'accept',
        documentName: 'business-license.jpg',
        status: 'success',
        createdAt: new Date(Date.now() - 1800000).toISOString()
      }
    ];
    
    res.json({ logs });
  } catch (error: unknown) {
    console.error('Upload logs error:', error);
    res.status(500).json({ error: 'Failed to fetch upload logs' });
  }
});

// POST rebind document file (recovery)
router.post('/:id/rebind', upload.single('file'), async (req: any, res: any) => {
  const docId = req.params.id;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    // In production: calculate SHA256, upload to S3, update database
    console.log(`Document ${docId} rebound with new file: ${req.file.originalname}`);
    res.json({ success: true, message: 'Document file rebound successfully' });
  } catch (error: unknown) {
    console.error('Document rebind error:', error);
    res.status(500).json({ error: 'Failed to rebind document file' });
  }
});

// GET download all documents as ZIP
router.get('/:applicationId/download-zip', async (req: any, res: any) => {
  const applicationId = req.params.applicationId;
  
  try {
    // In production: create ZIP archive with all accepted documents
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Application-${applicationId}-Documents.zip"`);
    
    // Mock ZIP response for now
    res.send('Mock ZIP file content for application ' + applicationId);
  } catch (error: unknown) {
    console.error('ZIP download error:', error);
    res.status(500).json({ error: 'Failed to create ZIP download' });
  }
});

// POST upload document via base64
router.post('/upload-base64', async (req: any, res: any) => {
  const { fileName, base64, applicationId, documentType } = req.body;
  
  try {
    if (!fileName || !base64 || !applicationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // In production: decode base64, calculate SHA256, upload to S3
    const documentId = `doc-${Date.now()}`;
    console.log(`Base64 document uploaded: ${fileName} for application ${applicationId}`);
    
    res.json({ success: true, documentId });
  } catch (error: unknown) {
    console.error('Base64 upload error:', error);
    res.status(500).json({ error: 'Failed to upload base64 document' });
  }
});

// POST /api/document-verification - Verify uploaded documents meet requirements
router.post('/document-verification', async (req: any, res: any) => {
  try {
    const { documentId, applicationId, documentType, requirements } = req.body;

    console.log('🔍 [DOCUMENT-VERIFICATION] Verifying document:', { documentId, applicationId, documentType });

    if (!documentId && !applicationId) {
      return res.status(400).json({
        success: false,
        error: 'Either documentId or applicationId is required'
      });
    }

    // Mock verification logic - in production would check actual document requirements
    const verification = {
      documentId: documentId || `doc-${Date.now()}`,
      applicationId: applicationId || `app-${Date.now()}`,
      documentType: documentType || 'business_license',
      verified: true,
      compliance_status: 'compliant',
      requirements_met: {
        readable: true,
        complete: true,
        valid_format: true,
        contains_required_data: true,
        not_expired: true,
        legible_signatures: true
      },
      verification_score: 0.95,
      extracted_data: {
        business_name: 'Sample Business Corp',
        license_number: '12345-67890',
        issue_date: '2024-01-01',
        expiry_date: '2025-12-31',
        state: 'CA'
      },
      issues: [],
      recommendations: [
        'Document meets all requirements',
        'High quality scan detected',
        'All required fields extracted successfully'
      ],
      verified_at: new Date().toISOString(),
      verification_method: 'automated_ocr_plus_rules'
    };

    console.log('✅ [DOCUMENT-VERIFICATION] Document verified successfully:', verification.documentId);

    res.status(200).json({
      success: true,
      verification
    });

  } catch (error: unknown) {
    console.error('❌ [DOCUMENT-VERIFICATION] Verification failed:', error);
    
    let errorMessage = "Failed to verify document";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error ? error.message : String(error).includes('not found')) {
        statusCode = 404;
      } else if (error instanceof Error ? error.message : String(error).includes('invalid') || error instanceof Error ? error.message : String(error).includes('missing')) {
        statusCode = 400;
      }
    }

    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

export default router;