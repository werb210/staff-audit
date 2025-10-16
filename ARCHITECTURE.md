# 🔧 System Architecture Guide

## 🚫 DUPLICATE PREVENTION SYSTEM (NEW - MANDATORY)

**🚨 CRITICAL: ZERO TOLERANCE FOR DUPLICATES**

This system now has **MULTIPLE LAYERS** of duplicate prevention that will **BLOCK ALL BUILDS** if violations are detected.

### 🛡️ Enforcement Layers:
1. **Pre-commit hooks** - Block commits with duplicates
2. **CI/CD pipeline** - Fail builds completely  
3. **Manual validation** - Available for development

### ⚠️ CURRENT VIOLATIONS DETECTED:
```
❌ 10 CRITICAL ERRORS (Build-blocking):
  - EntityDrawerV2.tsx (Version suffix forbidden)
  - ApplicationDrawerV3.tsx (Version suffix forbidden)  
  - SettingsPageOld.tsx (Legacy file forbidden)
  - Multiple Demo files (Test files in production)
  - Conflicting exports: SystemStatus, SettingsPage, MarketingHub, AppDrawer

⚠️ 167 WARNING FILES:
  - Orphaned pages not imported in routes.tsx
```

### 🔧 Available Commands:
```bash
# Check for duplicates (run this before any changes)
node scripts/prevent-duplicates.js

# Generate cleanup script  
node scripts/fix-duplicates.js script

# Run strict CI validation
node scripts/ci-duplicate-check.js
```

**ALL DEVELOPERS MUST:** Run duplicate checks before committing any new files.

---

## 📌 Overview

This project contains **two separate applications** that work together as a comprehensive financial lending platform:

1. **Client Application** (`/client/`)
2. **Staff Portal** (`/apps/staff-portal/`)

Each has distinct responsibilities and must **not be merged** or confused during development.

---

## ✅ Client Application (`/client/`)

### Purpose:
Frontend-only application used by loan applicants to submit funding applications.

### Responsibilities:
* Handles user-facing multi-step application form
* Supports user authentication (email + SMS OTP)
* Collects and validates application data and required documents
* Sends all data and files to the Staff App via secure API after final submission
* Provides application status tracking and communication with applicants

### Restrictions:
* Does **not** connect directly to the database
* Does **not** perform OCR, analysis, or backend logic
* Should **never** include staff-only features like CRM or sales pipeline
* Authentication optional for demonstration purposes

### Technology Stack:
* React + Vite frontend
* Wouter for routing
* TanStack Query for API communication
* Tailwind CSS for styling

---

## ✅ Staff Portal (`/apps/staff-portal/`)

### Purpose:
Full-stack CRM system used by internal staff for managing applications and customer relationships.

### Responsibilities:
* **Database Operations**: Owns and connects directly to PostgreSQL database
* **Application Processing**: Receives data from Client App and processes it
* **Document Analysis**: Runs OCR analysis on uploaded financial documents
* **Banking Intelligence**: Performs banking transaction analysis using AI
* **CRM Functionality**: Complete contact/company/deal management
* **Sales Pipeline**: Drag-and-drop application management across stages
* **Communication Hub**: SMS/Email/Voice via Twilio integration
* **Analytics & Reporting**: Comprehensive business intelligence dashboards
* **Document Lifecycle**: View, download, approve, reject documents
* **Audit Logging**: Complete activity tracking and compliance

### Current Features:
* **V2 CRM System**: 11 comprehensive modules
  - Dashboard with analytics
  - Applications management
  - Sales pipeline with drag-and-drop
  - Contacts and companies
  - Document management with OCR
  - Communication system
  - Reports and analytics
  - Task management
  - Calendar integration
  - Marketing campaigns
  - Advertisement management

* **AI-Powered Analysis Modules**:
  - Risk Assessment Engine
  - Banking Analysis Module
  - Document Similarity Detection (Fraud AI)
  - Industry Benchmarking System
  - Communications System

### Technology Stack:
* React + Vite frontend with V2 architecture
* Express.js backend API
* PostgreSQL database with Drizzle ORM
* OpenAI GPT-4 for document analysis
* Twilio for communications
* JWT authentication (currently disabled)

---

## 🔄 Communication Flow

### Normal Operation:
1. **Client App**:
   * User completes application steps and uploads files
   * On submit, data is POSTed to Staff App via secure API

2. **Staff App**:
   * Stores received data in PostgreSQL database
   * Triggers document ingestion, OCR, and analysis pipelines
   * Creates Application Card in sales pipeline
   * Displays processed data in CRM dashboard for staff review
   * Enables staff to communicate with applicants

### Current Demo Mode (Authentication Disabled):
* Direct access to Staff Portal CRM features
* Sample data displayed for demonstration
* All 11 CRM modules accessible without login
* Default admin user privileges

---

## 🔐 Separation of Concerns

### Client App (Public-Facing):
* **UI**: Clean, professional application interface
* **Security**: Secure form submission with validation
* **Communication**: API calls to Staff App only
* **Data**: No direct database access

### Staff Portal (Internal-Facing):
* **Database**: All CRUD operations and data storage
* **Processing**: OCR, AI analysis, document processing
* **Security**: Role-based access control and audit logging
* **Integration**: External APIs (Twilio, OpenAI, SignNow)

---

## 🧪 Development & Debugging

### Running the Applications:

#### Staff Portal Development:
```bash
# Primary development mode (serves client app configured for staff portal)
npm run dev

# Alternative: Direct staff portal development
cd apps/staff-portal && npm run dev
```

#### Client App Development:
```bash
cd client && npm run dev
```

### Verification Checklist:

#### Staff Portal Should Display:
* ✅ Sidebar with 11 CRM navigation items
* ✅ AdminDashboard with tabbed interface
* ✅ Applications management without login requirements
* ✅ Sales pipeline with drag-and-drop functionality
* ✅ Console logs: "🎯 V2Routes rendered!" and "✅ V2 routing system is working correctly!"

#### Client App Should Display:
* ✅ Multi-step application form
* ✅ Document upload interface
* ✅ API submission to Staff App
* ✅ No CRM or staff-only features

### Console Debugging:
* Check browser console for routing confirmations
* Verify API calls are going to correct endpoints
* Monitor authentication status (currently disabled)

---

## 📁 File Structure

```
/
├── client/                     # Client Application (Frontend-only)
│   ├── src/
│   │   ├── pages/             # Application form pages
│   │   ├── components/        # UI components
│   │   └── hooks/             # API hooks
├── apps/staff-portal/         # Staff Portal (Full-stack CRM)
│   ├── src/
│   │   ├── v2/               # V2 Architecture
│   │   │   ├── routes.tsx    # V2 routing system
│   │   │   ├── navigation.ts # CRM navigation items
│   │   │   └── components/   # V2 components
│   │   ├── routes/           # Legacy routes
│   │   └── contexts/         # Authentication contexts
├── server/                    # Backend API (Express.js)
│   ├── routes/               # API endpoints
│   ├── services/             # Business logic
│   └── db.ts                 # Database connection
├── shared/                    # Shared components and types
│   ├── design-system/        # UI component library
│   └── schema.ts             # Database schema
└── docs/                     # Documentation
```

---

## 🚀 Current Status

### Authentication Status:
* **DISABLED** for demonstration purposes
* Direct access to all CRM features enabled
* Default admin user created for role-based routing
* No login requirements or redirects

### V2 Migration Status:
* ✅ Design system consolidation completed
* ✅ Navigation standardization implemented
* ✅ Component architecture unified
* ✅ Sales pipeline fully functional
* ✅ CRM modules accessible and working

### Ready for Development:
* Both applications properly separated
* Clear development workflow established
* Comprehensive testing capabilities available
* Production deployment architecture defined

---

This architecture ensures clean separation of concerns while enabling powerful collaboration between the client-facing application and the internal CRM system.