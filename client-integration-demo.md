# Client App Integration APIs - Staff CRM System

## Overview
Complete client-to-staff API integration system providing comprehensive endpoints for external client applications to interact with the Staff CRM system.

## API Endpoints

### Base URL: `https://staff.boreal.financial/api/client`

### 1. Lender Products API
**Endpoint:** `GET /api/client/lender-products`
**Description:** Fetch all available lender products for client applications
**Authentication:** Public (No authentication required)

**Response Example:**
```json
{
  "success": true,
  "products": [
    {
      "id": "uuid",
      "lender_name": "Accord Financial",
      "name": "Asset Based Lending",
      "category": "business_loan",
      "min_amount": 50000,
      "max_amount": 2000000,
      "interest_rate": "6.5% - 12.5%",
      "term": "12 - 60 months",
      "min_credit_score": 650,
      "description": "Flexible asset-based lending...",
      "country": "CA",
      "active": true
    }
  ]
}
```

### 2. Application Submission API
**Endpoint:** `POST /api/client/applications`
**Description:** Submit loan applications from client apps
**Authentication:** Public (No authentication required)

**Request Example:**
```json
{
  "step1": {
    "fundingAmount": 50000,
    "fundsPurpose": "working capital",
    "country": "CA",
    "currency": "CAD"
  },
  "step3": {
    "businessName": "ABC Corporation",
    "businessPhone": "555-123-4567",
    "businessEmail": "contact@abc-corp.com",
    "industry": "manufacturing"
  },
  "step4": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@abc-corp.com",
    "phone": "555-987-6543"
  }
}
```

**Response Example:**
```json
{
  "success": true,
  "application": {
    "id": "application-uuid",
    "status": "submitted",
    "created_at": "2025-08-23T14:55:00Z"
  }
}
```

### 3. Application Status API
**Endpoint:** `GET /api/client/applications/{applicationId}`
**Description:** Check application status and details
**Authentication:** Public (No authentication required)

**Response Example:**
```json
{
  "success": true,
  "application": {
    "id": "application-uuid",
    "business_name": "ABC Corporation",
    "funding_amount": 50000,
    "status": "under_review",
    "created_at": "2025-08-23T14:55:00Z",
    "updated_at": "2025-08-23T15:30:00Z"
  }
}
```

### 4. Document Upload API
**Endpoint:** `POST /api/client/documents/upload`
**Description:** Upload documents for applications
**Authentication:** Public (No authentication required)

**Request Example:**
```json
{
  "applicationId": "application-uuid",
  "documentType": "financial_statement",
  "fileName": "2024-financial-statement.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf",
  "base64Data": "base64-encoded-file-content..."
}
```

**Response Example:**
```json
{
  "success": true,
  "document": {
    "id": "document-uuid",
    "status": "uploaded",
    "message": "Document uploaded successfully"
  }
}
```

### 5. Chat/Human Support API
**Endpoint:** `POST /api/client/chat/start`
**Description:** Start a chat session with human support
**Authentication:** Public (No authentication required)

**Request Example:**
```json
{
  "applicationId": "application-uuid",
  "email": "john@abc-corp.com",
  "name": "John Doe",
  "message": "I need help with my loan application",
  "priority": "medium",
  "category": "application_help"
}
```

**Response Example:**
```json
{
  "success": true,
  "session": {
    "id": "chat-session-uuid",
    "status": "open",
    "message": "Chat session started. A staff member will respond shortly."
  }
}
```

### 6. Issue Reporting API
**Endpoint:** `POST /api/client/issues/report`
**Description:** Report technical issues or bugs
**Authentication:** Public (No authentication required)

**Request Example:**
```json
{
  "applicationId": "application-uuid",
  "email": "john@abc-corp.com",
  "name": "John Doe",
  "issueType": "bug",
  "title": "Application form not submitting",
  "description": "The submit button is not working on the loan application form",
  "severity": "medium",
  "browserInfo": "Chrome 118.0.0.0",
  "currentUrl": "https://client.example.com/apply"
}
```

**Response Example:**
```json
{
  "success": true,
  "issue": {
    "id": "issue-uuid",
    "status": "open",
    "message": "Issue reported successfully. Our team will investigate and respond."
  }
}
```

### 7. Health Check API
**Endpoint:** `GET /api/client/health`
**Description:** Check API service health and available endpoints
**Authentication:** Public (No authentication required)

**Response Example:**
```json
{
  "success": true,
  "service": "client-api",
  "timestamp": "2025-08-23T14:55:00Z",
  "endpoints": [
    "GET /lender-products",
    "POST /applications",
    "GET /applications/:id",
    "POST /documents/upload",
    "POST /chat/start",
    "POST /issues/report"
  ]
}
```

## Database Tables Created
- **chat_sessions**: Store chat sessions between clients and staff
- **issue_reports**: Track technical issues and bug reports from clients

## Authentication
All client API endpoints are public and do not require authentication. This allows external client applications to integrate seamlessly without complex authentication flows.

## Error Handling
All endpoints return consistent error responses:
```json
{
  "error": "error_code",
  "message": "Human readable error message"
}
```

## Integration Status
✅ **API Endpoints Created**: All 6 core endpoints implemented  
✅ **Database Tables**: Created chat_sessions and issue_reports tables  
✅ **Route Mounting**: Successfully mounted at /api/client/*  
✅ **Error Handling**: Comprehensive validation and error responses  
✅ **Documentation**: Complete API documentation provided  

## Usage from Client Apps
```javascript
// Example client integration
const API_BASE = 'https://staff.boreal.financial/api/client';

// Fetch lender products
const products = await fetch(`${API_BASE}/lender-products`)
  .then(res => res.json());

// Submit application
const application = await fetch(`${API_BASE}/applications`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(applicationData)
}).then(res => res.json());

// Start chat session
const chatSession = await fetch(`${API_BASE}/chat/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(chatData)
}).then(res => res.json());
```

## Next Steps
1. **Production Deployment**: All APIs are ready for production deployment
2. **Client Integration**: External client applications can begin integration
3. **Monitoring**: Set up monitoring and analytics for API usage
4. **Rate Limiting**: Consider implementing rate limiting for production use
5. **Caching**: Add caching layer for better performance of lender products endpoint