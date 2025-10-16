# Lender Portal Access Guide

## Issue Resolved ✅
The routing has been fixed. URLs now properly serve HTML applications instead of JSON health check responses.

## Lender Portal Access URLs

### Development Environment
- **Staff Portal**: `http://localhost:5000/`
- **Lender Portal**: `http://localhost:5000/apps/lender-portal/`

### Production Environment (After Deployment)
- **Staff Portal**: `https://your-deployment-url/`
- **Lender Portal**: `https://your-deployment-url/apps/lender-portal/`

## What Lenders Will See

### 1. Login Screen
When lenders access `/apps/lender-portal/`, they see:
- **Lender Portal Login** form
- Email and password fields
- Clean, professional interface
- Pre-filled test credentials (development only)

### 2. After Login Success
Lenders are redirected to their dedicated dashboard with:

#### Dashboard Page
- **Statistics specific to their products only**
- Applications submitted for their products
- Performance metrics for their lending business
- Professional navigation header with logout

#### My Products Page
- Manage only their assigned lending products
- Edit rates, terms, and requirements
- Cannot see other lenders' products
- Role-based data filtering by lender_id

#### Applications Page
- Review applications submitted specifically for their products
- Approve/reject applications for their products only
- Cannot see applications for other lenders

## Test Lender Credentials

### Primary Test Account
- **Email**: lender@boreal.com
- **Password**: testpass123
- **Company**: Boreal Financial Partners
- **Assigned Products**: 12 authentic lending products
- **Role**: Lender (restricted access)

## Security Features

### Role-Based Access Control
- JWT tokens include "lender" role verification
- Database queries automatically filtered by lender_id
- Cannot access staff portal routes (/dashboard, /applications, etc.)
- Can only access lender portal routes (/apps/lender-portal/*)

### Authentication Flow
1. Lender enters credentials at `/apps/lender-portal/`
2. POST to `/api/lender-auth/login` validates credentials
3. JWT token generated with lender role and lender_id
4. Token stored in secure HTTP-only cookie
5. All subsequent API calls filtered by lender_id

## API Endpoints for Lenders

### Lender Authentication
- `POST /api/lender-auth/login` - Login with credentials
- `GET /api/lender-auth/me` - Get current lender info
- `POST /api/lender-auth/logout` - Logout and clear session

### Lender Products Management
- `GET /api/lender-products/` - Get lender's products only
- `POST /api/lender-products/` - Add new product
- `PATCH /api/lender-products/:id` - Update product
- `DELETE /api/lender-products/:id` - Delete product

### Lender Applications
- `GET /api/lender-applications/` - Applications for lender's products only
- `PATCH /api/lender-applications/:id` - Update application status

All endpoints automatically filter by lender_id from JWT token.

## How to Provide Lender Access

### Step 1: Create Lender Credentials
1. Access Staff Portal lender management: `/lender-management`
2. Click on any lender name to open credential modal
3. Enter username (email) and password
4. Save credentials to database

### Step 2: Provide Access Information
Give lenders these details:
- **Portal URL**: `/apps/lender-portal/`
- **Login Email**: (the email you set)
- **Password**: (the password you set)
- **Support**: They can only see their own products and applications

### Step 3: Verification
Test the credentials by:
1. Logging in at the lender portal URL
2. Verifying they see only their products
3. Confirming they cannot access staff portal routes

This ensures complete separation between staff operations and lender access.