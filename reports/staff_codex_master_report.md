# Staff Codex Master Report

Generated at 2025-10-24T22:09:13.385Z

Latest reports analysed: 43
Status totals — ✅ Pass: 13, ⚠️ Warn: 1, ❌ Fail: 0

| Area | Status | Latest Report | Notes |
|------|--------|---------------|-------|
| analytics | ✅ Pass | codex-analytics-2025-10-24T21-32-02-567Z.txt (2025-10-24T22:07:46.684Z) | [PASS] Health endpoint reachable |
| communication | ✅ Pass | codex-communication-2025-10-24T21-31-51-210Z.txt (2025-10-24T22:07:46.684Z) | [PASS] Health endpoint reachable |
| crm | ✅ Pass | codex-crm-2025-10-24T21-31-53-359Z.txt (2025-10-24T22:07:46.684Z) | [PASS] Health endpoint reachable |
| documents | ✅ Pass | codex-documents-2025-10-24T21-31-49-130Z.txt (2025-10-24T22:07:46.684Z) | [PASS] Health endpoint reachable |
| functional | ✅ Pass | codex-functional-2025-10-24T21-47-18-484Z.txt (2025-10-24T22:07:46.688Z) | [PASS] /api/auth/login |
| infrastructure | ✅ Pass | codex-infrastructure-2025-10-24T21-32-06-614Z.txt (2025-10-24T22:07:46.688Z) | [PASS] Health endpoint reachable |
| last-fail | ✅ Pass | codex-last-fail.txt (2025-10-24T22:07:46.688Z) | reports/codex-run-2025-10-24T17-16-26-416Z.txt |
| last-pass | ✅ Pass | codex-last-pass.txt (2025-10-24T22:07:46.688Z) | reports/codex-run-2025-10-24T21-47-17-318Z.txt |
| lenders | ✅ Pass | codex-lenders-2025-10-24T21-31-56-812Z.txt (2025-10-24T22:07:46.688Z) | [PASS] Health endpoint reachable |
| marketing | ✅ Pass | codex-marketing-2025-10-24T21-32-04-642Z.txt (2025-10-24T22:07:46.688Z) | [PASS] Health endpoint reachable |
| pipeline | ✅ Pass | codex-pipeline-2025-10-24T21-31-47-057Z.txt (2025-10-24T22:07:46.688Z) | [PASS] Health endpoint reachable |
| run | ⚠️ Warn | codex-run-2025-10-24T21-47-17-318Z.txt (2025-10-24T22:07:46.692Z) | ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| security | ✅ Pass | codex-security-2025-10-24T21-31-58-742Z.txt (2025-10-24T22:07:46.692Z) | [PASS] Health endpoint reachable |
| v1-enforce | ✅ Pass | codex-v1-enforce-2025-10-24T01-21-11-838Z.txt (2025-10-24T22:07:46.692Z) | ✅ Codex System Audit |

## Detailed report listing

### codex-run-2025-10-24T21-47-17-318Z.txt

- Status: ⚠️ Warn
- Size: 329 bytes

> CODEx Hygiene Audit
> 2025-10-24T21:47:17.325Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-security-2025-10-24T21-31-58-742Z.txt

- Status: ✅ Pass
- Size: 136 bytes

> [2025-10-24T21:31:58.758Z] security runner passed
> [PASS] Health endpoint reachable
> [PASS] Core API responding
> [PASS] Feature set loaded
> 

### codex-v1-enforce-2025-10-24T01-21-11-838Z.txt

- Status: ✅ Pass
- Size: 1463 bytes

> Boreal Staff App V1 Enforcement Run
> 2025-10-24T01:21:11.839Z
> ✅ Codex System Audit
> ✅ Codex Functional Verification
> 

### codex-functional-2025-10-24T21-47-18-484Z.txt

- Status: ✅ Pass
- Size: 107 bytes

> [PASS] /api/auth/login
> [PASS] /api/pipeline
> [PASS] /api/documents
> [PASS] /api/twilio
> [PASS] /api/_int/build

### codex-infrastructure-2025-10-24T21-32-06-614Z.txt

- Status: ✅ Pass
- Size: 142 bytes

> [2025-10-24T21:32:06.629Z] infrastructure runner passed
> [PASS] Health endpoint reachable
> [PASS] Core API responding
> [PASS] Feature set loaded
> 

### codex-last-fail.txt

- Status: ✅ Pass
- Size: 47 bytes

> reports/codex-run-2025-10-24T17-16-26-416Z.txt
> 

### codex-last-pass.txt

- Status: ✅ Pass
- Size: 47 bytes

> reports/codex-run-2025-10-24T21-47-17-318Z.txt
> 

### codex-lenders-2025-10-24T21-31-56-812Z.txt

- Status: ✅ Pass
- Size: 135 bytes

> [2025-10-24T21:31:56.826Z] lenders runner passed
> [PASS] Health endpoint reachable
> [PASS] Core API responding
> [PASS] Feature set loaded
> 

### codex-marketing-2025-10-24T21-32-04-642Z.txt

- Status: ✅ Pass
- Size: 137 bytes

> [2025-10-24T21:32:04.655Z] marketing runner passed
> [PASS] Health endpoint reachable
> [PASS] Core API responding
> [PASS] Feature set loaded
> 

### codex-pipeline-2025-10-24T21-31-47-057Z.txt

- Status: ✅ Pass
- Size: 136 bytes

> [2025-10-24T21:31:47.074Z] pipeline runner passed
> [PASS] Health endpoint reachable
> [PASS] Core API responding
> [PASS] Feature set loaded
> 

### codex-run-2025-10-24T01-15-06-502Z.txt

- Status: ❌ Fail
- Size: 3783 bytes

> CODEx Hygiene Audit
> 2025-10-24T01:15:06.509Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T01-15-16-723Z.txt

- Status: ❌ Fail
- Size: 3783 bytes

> CODEx Hygiene Audit
> 2025-10-24T01:15:16.730Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T01-21-12-308Z.txt

- Status: ❌ Fail
- Size: 3783 bytes

> CODEx Hygiene Audit
> 2025-10-24T01:21:12.313Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T15-36-06-610Z.txt

- Status: ❌ Fail
- Size: 4376 bytes

> CODEx Hygiene Audit
> 2025-10-24T15:36:06.615Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T15-36-34-244Z.txt

- Status: ❌ Fail
- Size: 4376 bytes

> CODEx Hygiene Audit
> 2025-10-24T15:36:34.250Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T15-46-13-080Z.txt

- Status: ❌ Fail
- Size: 4376 bytes

> CODEx Hygiene Audit
> 2025-10-24T15:46:13.088Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T15-46-21-697Z.txt

- Status: ❌ Fail
- Size: 4376 bytes

> CODEx Hygiene Audit
> 2025-10-24T15:46:21.703Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T16-14-52-098Z.txt

- Status: ❌ Fail
- Size: 4376 bytes

> CODEx Hygiene Audit
> 2025-10-24T16:14:52.105Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T16-20-13-920Z.txt

- Status: ❌ Fail
- Size: 4283 bytes

> CODEx Hygiene Audit
> 2025-10-24T16:20:13.930Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T16-29-11-345Z.txt

- Status: ❌ Fail
- Size: 4283 bytes

> CODEx Hygiene Audit
> 2025-10-24T16:29:11.351Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T16-52-08-399Z.txt

- Status: ❌ Fail
- Size: 3409 bytes

> CODEx Hygiene Audit
> 2025-10-24T16:52:08.408Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T17-16-21-171Z.txt

- Status: ❌ Fail
- Size: 3584 bytes

> CODEx Hygiene Audit
> 2025-10-24T17:16:21.179Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T17-16-26-416Z.txt

- Status: ❌ Fail
- Size: 3584 bytes

> CODEx Hygiene Audit
> 2025-10-24T17:16:26.423Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T18-12-19-490Z.txt

- Status: ⚠️ Warn
- Size: 329 bytes

> CODEx Hygiene Audit
> 2025-10-24T18:12:19.497Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-run-2025-10-24T18-40-13-333Z.txt

- Status: ⚠️ Warn
- Size: 329 bytes

> CODEx Hygiene Audit
> 2025-10-24T18:40:13.341Z
> 
> ✅ All required packages present
> ⚠️ Missing environment variables: TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AWS_REGION, S3_BUCKET, SENDGRID_API_KEY, MS_CLIENT_ID, MS_TENANT_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

### codex-analytics-2025-10-24T21-32-02-567Z.txt

- Status: ✅ Pass
- Size: 137 bytes

> [2025-10-24T21:32:02.583Z] analytics runner passed
> [PASS] Health endpoint reachable
> [PASS] Core API responding
> [PASS] Feature set loaded
> 

### codex-communication-2025-10-24T21-31-51-210Z.txt

- Status: ✅ Pass
- Size: 141 bytes

> [2025-10-24T21:31:51.224Z] communication runner passed
> [PASS] Health endpoint reachable
> [PASS] Core API responding
> [PASS] Feature set loaded
> 

### codex-crm-2025-10-24T21-31-53-359Z.txt

- Status: ✅ Pass
- Size: 131 bytes

> [2025-10-24T21:31:53.373Z] crm runner passed
> [PASS] Health endpoint reachable
> [PASS] Core API responding
> [PASS] Feature set loaded
> 

### codex-documents-2025-10-24T21-31-49-130Z.txt

- Status: ✅ Pass
- Size: 137 bytes

> [2025-10-24T21:31:49.144Z] documents runner passed
> [PASS] Health endpoint reachable
> [PASS] Core API responding
> [PASS] Feature set loaded
> 

### codex-functional-2025-10-24T01-15-13-765Z.txt

- Status: ❌ Fail
- Size: 276 bytes

> CODEx Functional Coverage Test
> 2025-10-24T01:15:13.767Z
> ❌ CRM Endpoints → failed
> ❌ AI OCR Endpoint → failed
> ❌ Lender Matching → failed

### codex-functional-2025-10-24T01-15-18-482Z.txt

- Status: ❌ Fail
- Size: 276 bytes

> CODEx Functional Coverage Test
> 2025-10-24T01:15:18.484Z
> ❌ CRM Endpoints → failed
> ❌ AI OCR Endpoint → failed
> ❌ Lender Matching → failed

### codex-functional-2025-10-24T01-21-14-459Z.txt

- Status: ❌ Fail
- Size: 276 bytes

> CODEx Functional Coverage Test
> 2025-10-24T01:21:14.460Z
> ❌ CRM Endpoints → failed
> ❌ AI OCR Endpoint → failed
> ❌ Lender Matching → failed

### codex-functional-2025-10-24T15-36-07-485Z.txt

- Status: ❌ Fail
- Size: 276 bytes

> CODEx Functional Coverage Test
> 2025-10-24T15:36:07.486Z
> ❌ CRM Endpoints → failed
> ❌ AI OCR Endpoint → failed
> ❌ Lender Matching → failed

### codex-functional-2025-10-24T15-36-35-127Z.txt

- Status: ❌ Fail
- Size: 276 bytes

> CODEx Functional Coverage Test
> 2025-10-24T15:36:35.128Z
> ❌ CRM Endpoints → failed
> ❌ AI OCR Endpoint → failed
> ❌ Lender Matching → failed

### codex-functional-2025-10-24T15-46-14-356Z.txt

- Status: ❌ Fail
- Size: 276 bytes

> CODEx Functional Coverage Test
> 2025-10-24T15:46:14.357Z
> ❌ CRM Endpoints → failed
> ❌ AI OCR Endpoint → failed
> ❌ Lender Matching → failed

### codex-functional-2025-10-24T15-46-22-986Z.txt

- Status: ❌ Fail
- Size: 276 bytes

> CODEx Functional Coverage Test
> 2025-10-24T15:46:22.987Z
> ❌ CRM Endpoints → failed
> ❌ AI OCR Endpoint → failed
> ❌ Lender Matching → failed

### codex-functional-2025-10-24T16-14-53-388Z.txt

- Status: ❌ Fail
- Size: 122 bytes

> [FAIL] /api/auth/login ()
> [FAIL] /api/pipeline ()
> [FAIL] /api/documents ()
> [FAIL] /api/twilio ()
> [FAIL] /api/_int/build ()

### codex-functional-2025-10-24T16-20-15-372Z.txt

- Status: ❌ Fail
- Size: 122 bytes

> [FAIL] /api/auth/login ()
> [FAIL] /api/pipeline ()
> [FAIL] /api/documents ()
> [FAIL] /api/twilio ()
> [FAIL] /api/_int/build ()

### codex-functional-2025-10-24T16-29-12-280Z.txt

- Status: ❌ Fail
- Size: 123 bytes

> [FAIL] /api/auth/login ()
> [FAIL] /api/pipeline ()
> [FAIL] /api/documents ()
> [FAIL] /api/twilio ()
> [FAIL] /api/_int/build ()

### codex-functional-2025-10-24T16-52-09-796Z.txt

- Status: ❌ Fail
- Size: 122 bytes

> [FAIL] /api/auth/login ()
> [FAIL] /api/pipeline ()
> [FAIL] /api/documents ()
> [FAIL] /api/twilio ()
> [FAIL] /api/_int/build ()

### codex-functional-2025-10-24T17-16-27-757Z.txt

- Status: ❌ Fail
- Size: 122 bytes

> [FAIL] /api/auth/login ()
> [FAIL] /api/pipeline ()
> [FAIL] /api/documents ()
> [FAIL] /api/twilio ()
> [FAIL] /api/_int/build ()

### codex-functional-2025-10-24T18-12-20-706Z.txt

- Status: ✅ Pass
- Size: 107 bytes

> [PASS] /api/auth/login
> [PASS] /api/pipeline
> [PASS] /api/documents
> [PASS] /api/twilio
> [PASS] /api/_int/build

### codex-functional-2025-10-24T18-40-14-426Z.txt

- Status: ✅ Pass
- Size: 107 bytes

> [PASS] /api/auth/login
> [PASS] /api/pipeline
> [PASS] /api/documents
> [PASS] /api/twilio
> [PASS] /api/_int/build

