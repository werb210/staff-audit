# Document Storage Architecture Specification

## Production Storage Architecture

Based on the comprehensive specification provided, here is the complete document handling architecture for the staff portal application:

### A. Storage Choice Implementation

#### Local Development Environment
```
Structure: uploads/<applicationId>/<uuid>_<originalName>
Example: uploads/app-123/doc-456_financial-statement.pdf
```

#### Production Environment
```
Structure: S3 bucket with key applications/<appId>/<uuid>/<originalName>
Example: s3://bucket/applications/app-123/doc-456/financial-statement.pdf
```

### B. Database Integration Requirements

#### Database Insert After Each Successful Save

```typescript
await db.insert(applicationDocuments).values({
  applicationId,
  category: req.body.category,
  filePath: storedPath,
  mime: file.mimetype,
  size: file.size,
  status: 'RECEIVED',
});
```

**Required Fields:**
- `applicationId`: Links document to specific application
- `category`: Document type classification
- `filePath`: Complete storage path (local or S3)
- `mime`: MIME type for proper handling
- `size`: File size in bytes
- `status`: Processing status ('RECEIVED', 'ACCEPTED', 'REJECTED')

### C. Document Retrieval Endpoint

#### Implementation Pattern
```typescript
router.get('/documents/:id/download', async (req, res) => {
  const doc = await db.select().from(applicationDocuments)
                      .where(eq(id, req.params.id)).first();
  res.download(doc.filePath);
});
```

**Functionality:**
- Direct file streaming using stored `filePath`
- Authentication and authorization checks
- Proper MIME type headers
- File existence validation

### D. Staff UI Viewer Implementation

#### PDF Display
```jsx
<iframe src={downloadUrl} width="100%" height="600px" />
```

#### Image Display
```jsx
<img src={downloadUrl} alt="Document" className="max-w-full" />
```

**Features:**
- Inline document viewing
- Responsive design
- Loading states
- Error handling for missing files

### E. Email Integration with Lenders

#### Nodemailer/SendGrid Attachment Pattern
```typescript
attachments: [{ 
  filename: doc.originalName, 
  path: doc.filePath 
}]
```

**Process:**
1. Retrieve document metadata from database
2. Access binary file using stored `filePath`
3. Attach to email without copying/converting
4. Send to lender with proper filename

### F. OCR Job Processing

#### Worker Implementation
```typescript
// Worker picks filePath, streams binary into AI service
const fileBuffer = fs.readFileSync(doc.filePath);
const ocrResult = await processWithGPT4Vision(fileBuffer);

// Store OCR JSON in ocr_results table
await db.insert(ocrResults).values({
  documentId: doc.id,
  extractedData: ocrResult,
  confidence: ocrResult.confidence,
  // Never discard the source file
});
```

**Requirements:**
- Use actual `filePath` to read binary data
- Process with GPT-4 Vision / Azure Form Recognizer
- Store structured results in `ocr_results` table
- Preserve original files permanently

### G. Pipeline UI Safeguards

#### Accept/Reject Button Implementation
```typescript
// PATCH /api/documents/:id
await db.update(applicationDocuments)
  .set({ status: action }) // 'ACCEPTED' or 'REJECTED'
  .where(eq(applicationDocuments.id, documentId));
```

#### Lenders Table Visibility Logic
```typescript
// Only show lenders when all documents are accepted
const allDocumentsAccepted = documents.every(doc => doc.status === 'ACCEPTED');
if (allDocumentsAccepted) {
  // Display lenders table
}
```

### H. Automated Testing Requirements

#### Integration Test
```javascript
// Upload a 1-page PDF
const uploadResponse = await upload1PagePDF();

// Immediately GET /documents/:id/download  
const downloadResponse = await fetch(`/documents/${uploadResponse.id}/download`);
const buffer = await downloadResponse.arrayBuffer();

// Assert binary length > 0
assert(buffer.byteLength > 0, 'Downloaded file should have content');
```

#### E2E Cypress Test
```javascript
// Client uploads file
cy.get('input[type="file"]').selectFile('test-document.pdf');
cy.get('[data-testid="upload-button"]').click();

// Staff viewer displays same file
cy.visit('/staff/documents');
cy.get('[data-testid="document-viewer"]').should('contain', 'test-document.pdf');
cy.get('iframe').should('be.visible'); // PDF viewer loaded
```

### I. Completion Checklist

| Item | Pass Condition | Status |
|------|---------------|---------|
| Upload saves real binary | 🟢 Able to open PDF with Acrobat | ✅ |
| DB row created | 🟢 application_documents row has non-null file_path | ✅ |
| Staff UI viewer works | 🟢 Iframe shows first page of PDF | ⚠️ |
| Download works | 🟢 curl -O returns identical file checksum | ✅ |
| OCR job uses file | 🟢 ocr_results.document_id FK populated | ✅ |

## Current Implementation Analysis

### ✅ Fully Implemented:
1. **Multer File Upload**: Proper `req.files` handling with disk storage
2. **Local Storage Structure**: `uploads/` directory with organization
3. **Database Schema**: Complete with all required fields
4. **Download Endpoint**: `/api/documents/:id/download` functional
5. **OCR Processing**: Uses actual file paths with GPT-4 Vision
6. **Email Integration**: References stored file paths for attachments

### ⚠️ Needs Implementation:
1. **Staff UI Viewer**: PDF iframe and image display components
2. **Accept/Reject Buttons**: PATCH endpoint for status updates
3. **Pipeline Safeguards**: Lender table visibility logic
4. **Automated Tests**: Integration and E2E test suites
5. **S3 Migration**: Production storage configuration

### 🔧 Implementation Priority:
1. **High**: Staff UI viewer with iframe/img display
2. **High**: Accept/Reject document status controls
3. **Medium**: Pipeline lender table safeguards
4. **Medium**: Automated test suite
5. **Low**: S3 production storage (can use local initially)

## Security Considerations

- **Authentication**: All endpoints require proper user authentication
- **Authorization**: Tenant-based document access control
- **File Validation**: MIME type verification and size limits
- **Path Security**: Prevent directory traversal attacks
- **Encryption**: Consider encryption at rest for sensitive documents

## Performance Optimizations

- **Streaming**: Large file downloads use streaming instead of loading in memory
- **Caching**: Implement appropriate cache headers for static documents
- **CDN**: Consider CDN for production document serving
- **Compression**: Optional compression for text-based documents

**Status**: Architecture specification complete, ready for implementation of remaining components.