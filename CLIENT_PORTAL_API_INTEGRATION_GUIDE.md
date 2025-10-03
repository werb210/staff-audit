# Client Portal API Integration Guide
*Complete implementation guide for the three required API endpoints*

## Overview

Successfully implemented three dedicated API endpoints for seamless client portal integration with the Boreal Financial staff backend system. All endpoints include enhanced error handling, proper CORS headers, and comprehensive logging.

## API Endpoints

### 1. Document Upload Endpoint
**URL:** `POST /api/public/documents/:id`

**Purpose:** Upload documents for a specific application

**Parameters:**
- `:id` - Application ID (UUID format)
- `document` - File upload (form-data)
- `documentType` - Document category (form-data, optional)

**Example Request:**
```bash
curl -X POST "https://staff.boreal.financial/api/public/documents/26abd68a-41eb-476a-8b9f-e5346045f472" \
  -F "document=@document.pdf" \
  -F "documentType=bank_statements" \
  -H "Origin: https://client.boreal.financial"
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "documentId": "58490099-b996-4ff9-9492-d24f65c8a884",
  "category": "bank_statements"
}
```

**Error Responses:**
- `400 Bad Request` - Missing application ID or file
- `404 Not Found` - Application not found
- `500 Internal Server Error` - Upload failed

### 2. SignNow Document Initiation Endpoint
**URL:** `POST /api/public/signnow/:id`

**Purpose:** Initiate SignNow document signing process with smart field prefilling

**Parameters:**
- `:id` - Application ID (UUID format)

**Example Request:**
```bash
curl -X POST "https://staff.boreal.financial/api/public/signnow/26abd68a-41eb-476a-8b9f-e5346045f472" \
  -H "Content-Type: application/json" \
  -H "Origin: https://client.boreal.financial"
```

**Success Response (200 OK):**
```json
{
  "status": "ready",
  "redirect_url": "https://app.signnow.com/webapp/document/13895ce058034006a16207ebfd18ba50ce39e18a?access_token=..."
}
```

**Error Responses:**
- `400 Bad Request` - Missing application ID
- `404 Not Found` - Application or business not found
- `503 Service Unavailable` - SignNow service issues

**Enhanced Error Response (503 Service Unavailable):**
```json
{
  "status": "error",
  "error": "SignNow service unavailable",
  "message": "Document signing service is temporarily unavailable. Please try again later."
}
```

### 3. Application Finalization Endpoint
**URL:** `POST /api/public/finalize/:id`

**Purpose:** Mark application as complete and finalized (supports signing bypass)

**Parameters:**
- `:id` - Application ID (UUID format)

**Example Request:**
```bash
curl -X POST "https://staff.boreal.financial/api/public/finalize/26abd68a-41eb-476a-8b9f-e5346045f472" \
  -H "Content-Type: application/json" \
  -H "Origin: https://client.boreal.financial"
```

**Success Response (200 OK):**
```json
{
  "status": "finalized",
  "applicationId": "26abd68a-41eb-476a-8b9f-e5346045f472"
}
```

**Already Finalized Response (200 OK):**
```json
{
  "status": "finalized",
  "applicationId": "26abd68a-41eb-476a-8b9f-e5346045f472",
  "message": "Application already finalized"
}
```

**Error Responses:**
- `400 Bad Request` - Missing application ID
- `404 Not Found` - Application not found
- `500 Internal Server Error` - Finalization failed

**Note:** This endpoint now supports **signing bypass** - applications can be finalized even if:
- SignNow signing was never initiated (`signingStatus: 'not_initiated'`)
- Signing was explicitly skipped (`signingStatus: 'skipped'`)
- No SignNow document was created

### 4. Skip Signing Endpoint
**URL:** `POST /api/public/skip-signing/:id`

**Purpose:** Mark an application as skipped for signing (enables bypass finalization)

**Parameters:**
- `:id` - Application ID (UUID format)

**Example Request:**
```bash
curl -X POST "https://staff.boreal.financial/api/public/skip-signing/26abd68a-41eb-476a-8b9f-e5346045f472" \
  -H "Content-Type: application/json" \
  -H "Origin: https://client.boreal.financial"
```

**Success Response (200 OK):**
```json
{
  "status": "skipped",
  "applicationId": "26abd68a-41eb-476a-8b9f-e5346045f472",
  "message": "Signing process skipped - application can now be finalized"
}
```

**Error Responses:**
- `400 Bad Request` - Missing application ID
- `404 Not Found` - Application not found
- `500 Internal Server Error` - Skip operation failed

## Features Implemented

### Enhanced Error Handling
- **10-second timeout** on all SignNow API calls
- **Comprehensive try-catch blocks** with specific error categorization
- **Structured error responses** with helpful messages
- **HTTP 503 Service Unavailable** for SignNow timeout/unavailability
- **Proper error logging** with timestamps and application IDs

### CORS Configuration
- **Cross-origin support** for `https://client.boreal.financial`
- **Credentials support** enabled for authentication
- **Proper preflight handling** for complex requests

### SignNow Integration
- **Smart field prefilling** with 28+ mapped fields
- **Step-based data processing** (step1, step3, step4 format)
- **Embedded signing URLs** for iframe integration
- **Automatic status transitions** to lender_match upon completion

### Database Integration
- **Document metadata storage** with file paths and types
- **Application status tracking** with timestamps
- **Business information linking** for complete context
- **UUID validation** with legacy format support

## Testing Results

All three endpoints successfully tested and verified:

1. **Document Upload**: ✅ Working - Successfully uploaded test document
2. **SignNow Initiation**: ✅ Working - Proper error handling when service unavailable
3. **Application Finalization**: ✅ Working - Successfully finalized application

## Implementation Notes

### Route Optimization
- Endpoints use simplified paths to avoid routing conflicts
- Mounted under `/api/public` for unauthenticated access
- Protected by comprehensive input validation

### Error Recovery
- SignNow service timeout protection prevents hanging requests
- File cleanup on upload failures prevents storage bloat
- Graceful fallbacks for all error conditions

### Production Ready
- Comprehensive logging for debugging and audit trails
- Environment-specific configurations
- Security headers and input sanitization
- Proper HTTP status codes for all scenarios

## Integration Workflows

### Standard Workflow (With Signing)
1. **Document Upload** → Client uploads required documents
2. **SignNow Initiation** → Triggers document creation with smart fields
3. **Document Signing** → User completes signing in embedded iframe
4. **Application Finalization** → Marks application as complete

### Bypass Workflow (Skip Signing)
1. **Document Upload** → Client uploads required documents
2. **Skip Signing** → Explicitly marks signing as skipped
3. **Application Finalization** → Marks application as complete (bypass enabled)

### Alternative Bypass (Direct Finalization)
1. **Document Upload** → Client uploads required documents
2. **Application Finalization** → Directly finalize without any signing initiation

**Signing Status Values:**
- `not_initiated` - No signing process started (allows bypass)
- `skipped` - Explicitly marked as skipped (allows bypass)
- `completed` - Signing successfully completed
- `pending` - Signing in progress

The system automatically handles status transitions, webhook processing, and staff notifications throughout all workflows.