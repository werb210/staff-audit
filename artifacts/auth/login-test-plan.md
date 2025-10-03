# Phase A.2 - Password + OTP Login Flow Test

## Test User Details
- **Email**: andrew.p@boreal.financial  
- **Password**: password123
- **Role**: admin
- **Tenant**: a1b2c3d4-e5f6-7890-abcd-ef1234567890 (BF)
- **Phone**: +17802648467

## Test Flow Expected:
1. **POST /api/auth-fixed/login** with credentials
2. **Response**: requiresOTP: true, tempToken provided  
3. **OTP Verification**: POST /api/auth-fixed/verify-otp
4. **Final Auth**: User authenticated, redirect to dashboard

## Authentication Architecture:
- **Fixed Auth Routes**: /api/auth-fixed/* (working system)
- **Mandatory 2FA**: All logins require SMS OTP
- **Dev Mode**: Any 6-digit code accepted in development
- **Session Based**: Uses cookies, not localStorage tokens

## Evidence to Capture:
- [ ] Login request/response HAR
- [ ] OTP flow HAR  
- [ ] Console logs (no React/auth errors)
- [ ] Dashboard successful load
- [ ] Cookie/session validation

## Next: WebAuthn/Passkey Testing
- [ ] Register passkey for user
- [ ] Test passkey-only login
- [ ] Capture WebAuthn payloads