# Boreal Financial - Staff Portal Platform

A comprehensive financial lending platform with advanced document management, document-signing integration, and intelligent business matching capabilities.

## 🚀 Features

### ✅ Complete Legacy Endpoint Elimination
- **Zero tolerance** for legacy format applications
- **Step-based validation** enforcing `step1/step3/step4` structure
- **Enterprise-grade security** with comprehensive input validation

### 🔐 Authentication & Security
- JWT-based authentication with 2FA support
- Role-based access control (RBAC)
- SQL injection protection with parameterized queries
- Comprehensive CORS configuration

### 📄 document-signing Document Integration
- Authentic document-signing API integration
- Smart Fields prefilling with 28+ business fields
- Embedded signing URLs for iframe integration
- Webhook processing for signature completion

### 💼 Business Features
- Loan application processing with pipeline management
- Document upload and management system
- Lender product matching (41+ authentic products)
- SMS notifications via Twilio integration
- Comprehensive audit logging

## 🛠 Technical Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **UI Library:** shadcn/ui + Tailwind CSS
- **Authentication:** JWT + Passport.js
- **File Handling:** Multer for uploads
- **External APIs:** document-signing, Twilio, Neon Database

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- document-signing account with API access
- Twilio account for SMS (optional)

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/werb210/staff.git
cd staff
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create `.env` file:
```env
# Database
DATABASE_URL=your_postgresql_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret

# document-signing Integration
document-signing_API_KEY=your_document-signing_api_key
TEMPLATE_ID_PROD=your_document-signing_template_id

# Twilio (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid

# Admin Access
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=your_secure_password

# Client API
CLIENT_API_KEY=your_client_api_key
```

### 4. Database Setup
```bash
# Push schema to database
npm run db:push

# Generate types (optional)
npm run db:generate
```

### 5. Start Development
```bash
npm run dev
```

Visit `http://localhost:5000` to access the staff portal.

## 📊 Production Deployment

### Build Application
```bash
npm run build
```

### Start Production Server
```bash
npm run start
```

## 🏗 Architecture

### Directory Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend API
├── shared/          # Shared TypeScript types and schemas  
├── scripts/         # Database and utility scripts
└── docs/           # Documentation
```

### Key Components
- **Step-Based Validation:** Enforces structured application data
- **Smart Fields Generation:** Automatic field mapping for document-signing documents
- **Webhook Processing:** Real-time signature status updates
- **Document Management:** Upload, preview, accept/reject workflow
- **Pipeline Automation:** Intelligent application progression

## 🔒 Security Features

### ✅ Input Validation
- Comprehensive Zod schema validation
- SQL injection protection via parameterized queries
- File upload security with type validation
- CORS configuration for cross-origin requests

### ✅ Authentication
- JWT tokens with configurable expiration
- Two-factor authentication via SMS
- Role-based permission system
- Session management with PostgreSQL store

### ✅ Data Protection
- Environment variable validation
- Sensitive data redaction in logs
- Secure password handling with bcrypt
- Production-ready error handling

## 📄 API Documentation

### Public Endpoints
- `POST /api/public/applications` - Create loan applications
- `GET /api/public/lenders` - Retrieve lender products
- `POST /api/public/upload/:applicationId` - Upload documents
- `GET /api/public/applications/:id/signature-status` - Check signing status

### Protected Endpoints
- `GET /api/applications` - Staff application management
- `POST /api/applications/:id/document-signing` - Generate document-signing documents
- `PATCH /api/documents/:id/accept` - Accept uploaded documents
- `GET /api/rbac/users` - User management

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Security Validation
```bash
npm run security:scan
```

## 📝 Recent Updates

### July 14, 2025 - Legacy Endpoint Elimination
- **Removed all legacy format bypass routes**
- **Implemented zero-tolerance step-based validation**
- **Enhanced document-signing integration with authentic API calls**
- **Fixed webhook endpoints for document-signing compatibility**
- **Added comprehensive error messaging and migration guidance**

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For technical support or questions:
- Create an issue in this repository
- Review the documentation in `/docs`
- Check the troubleshooting guide

## 📄 License

This project is proprietary software for Boreal Financial.

---

**Built with ❤️ for secure financial lending**

## Staff App Docs
- [Feature Map by Silo & Nav](docs/Staff-App_Feature-Map-and-Nav.md)
