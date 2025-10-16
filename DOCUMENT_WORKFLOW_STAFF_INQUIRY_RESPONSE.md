# Document Workflow API Analysis - Staff Inquiry Response

## 📩 **Comprehensive Document Workflow Breakdown**

This document provides a detailed analysis of how documents submitted via the client API are handled by the staff system, including storage, viewing, download, and OCR processing capabilities.

---

## 1. 📥 **Document Ingestion**

### **API Endpoint**: `POST /api/upload/:applicationId`
- **Method**: Multipart form-data upload using multer middleware
- **Categorization**: Automatic via `documentType` field in request
- **Application Assignment**: Automatic via URL parameter `:applicationId`
- **File Processing**: Documents are processed immediately upon upload

### **Workflow**:
1. Client submits document via API with application ID
2. Multer handles file upload and stores in file system
3. Document metadata stored in PostgreSQL database
4. OCR processing triggered automatically (if supported file type)
5. Document linked to application via `application_documents` junction table

---

## 2. 🗃️ **Storage Architecture**

### **Primary Storage**: File System + PostgreSQL Metadata
- **File System**: Documents stored in `uploads/` directory
- **Path Structure**: `uploads/<applicationId>/<uuid>_<originalName>`
- **Database**: Metadata only (file paths, types, sizes, timestamps)

### **Database Tables**:
- **`documents`**: Core document metadata
  - `id`, `applicationId`, `fileName`, `fileType`, `fileSize`
  - `documentType`, `filePath`, `uploadedBy`, `isRequired`, `isVerified`
- **`application_documents`**: Junction table linking apps to documents
  - `applicationId`, `documentId`, `category`, `isRequired`, `uploadOrder`
- **`expected_documents`**: Tracks required documents per application
  - `applicationId`, `category`, `requirementId`, `required`, `status`

### **Storage Method**: 
- ✅ **File System** (not database BLOBs)
- ✅ **Direct query capability** via file path stored in database
- ✅ **Metadata preservation** (original names, MIME types, file sizes)

---

## 3. 👀 **Viewing & Download Capabilities**

### **Staff Portal Access**: ✅ Full viewing and download support

#### **View Endpoint**: `GET /api/documents/:id/view`
- **Function**: Streams file with inline content disposition
- **Headers**: Sets appropriate Content-Type and inline disposition
- **Authentication**: Requires staff authentication
- **File Validation**: Checks file existence before streaming

#### **Download Endpoint**: `GET /api/documents/:id/download`
- **Function**: Forces download with attachment disposition
- **Headers**: Sets Content-Type, Content-Disposition, Content-Length
- **Authentication**: Requires staff authentication
- **File Streaming**: Uses fs.createReadStream for efficient transfer

#### **List Endpoints**:
- `GET /api/applications/:id/documents` - Documents by application
- `GET /api/documents` - All documents (admin access)

### **File Preservation**:
- ✅ **Original filenames** preserved in `originalName` field
- ✅ **MIME types** stored and used for proper content serving
- ✅ **File sizes** tracked for Content-Length headers

---

## 4. 🧠 **OCR Processing System**

### **OCR Service**: `server/ocrService.ts`
- **AI Provider**: OpenAI GPT-4 Vision API
- **Trigger**: Automatic processing on document upload
- **Processing**: Asynchronous background processing

### **Supported Formats**:
- **Images**: JPEG, PNG, GIF, BMP (via GPT-4 Vision)
- **PDFs**: Text extraction and image conversion
- **Text Files**: Direct text processing with GPT-4

### **OCR Results Storage**: `ocr_results` table
- **Fields**: `documentId`, `applicationId`, `extractedData`, `confidence`
- **Metrics**: `processingTimeMs`, `processingStatus`, `fieldConfidences`
- **Error Handling**: Stores error messages for failed processing

### **Access Endpoints**:
- `GET /api/applications/:id/ocr` - OCR results by application
- `GET /api/documents/:id/ocr` - OCR results by specific document

### **Re-processing**: ✅ OCR can be re-run on documents if needed

---

## 5. 🔍 **Admin/Dev Access Methods**

### **Direct Database Access**:
```sql
-- Get all documents for an application
SELECT d.*, ad.category, ad.isRequired 
FROM documents d 
JOIN application_documents ad ON d.id = ad.documentId 
WHERE ad.applicationId = 'uuid-here';

-- Get file path for direct access
SELECT filePath, originalName, mimeType 
FROM documents 
WHERE id = 'document-uuid';
```

### **Direct File System Access**:
- **Base Path**: `process.cwd() + document.uploadPath`
- **Structure**: Organized by application ID for easy navigation
- **Admin API**: `/api/documents` endpoint provides full document list

### **Staff Portal UI**:
- **Documents Tab**: Lists all documents with view/download buttons
- **Application View**: Shows documents per application
- **OCR Results**: Displays extracted data and confidence scores

---

## 6. 🔧 **Current System Status**

### **Operational Components**: ✅
- ✅ Document upload via API
- ✅ File system storage with database metadata
- ✅ Staff portal viewing and download
- ✅ OCR processing with GPT-4 Vision
- ✅ Database queries for document retrieval
- ✅ Authentication and authorization

### **Available for Testing**:
- **Staging Environment**: All endpoints operational
- **Production Environment**: Ready for deployment
- **Diagnostic Tool**: Available at `/document-diagnostic` route

---

## 7. 📊 **API Endpoint Summary**

### **Upload & Management**:
- `POST /api/upload/:applicationId` - Upload documents
- `GET /api/applications/:id/documents` - List documents by application
- `GET /api/documents` - All documents (admin only)

### **Access & Processing**:
- `GET /api/documents/:id/view` - View document in browser
- `GET /api/documents/:id/download` - Download document file
- `GET /api/applications/:id/ocr` - Get OCR results by application
- `GET /api/documents/:id/ocr` - Get OCR results by document

### **Authentication**:
- All endpoints require valid authentication tokens
- Role-based access control implemented
- Cross-origin support for client portal integration

---

## 8. 🧪 **Testing & Verification**

### **Diagnostic Tool**: 
Access comprehensive workflow testing at: `/document-diagnostic`

### **Manual Testing**:
1. Upload document via client API
2. Verify file appears in staff portal Documents tab
3. Test view and download functionality
4. Check OCR processing results
5. Validate database entries and file system storage

### **Production Readiness**: ✅
- All workflows tested and operational
- Error handling implemented
- Security measures in place
- Cross-origin support configured

---

**Summary**: The document workflow system is fully operational with comprehensive API support, file system storage, database metadata management, automatic OCR processing, and complete staff portal integration for viewing, downloading, and managing all client-submitted documents.