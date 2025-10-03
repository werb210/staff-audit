# Master Feature Checklist
_Generated: 2025-08-16T02:26:18.460Z_

**Total endpoints:** 172  ·  **Routers:** 41  ·  **Direct:** 60
**WARNING:** 2 wildcard handlers detected (possible route hijack)

## Tabs / Feature Areas

### Sales Pipeline
| Done | Method | Path | Source |
|:----:|:------:|------|--------|
| [ ] | GET | `/api/pipeline/board` | server/routes/pipeline.ts |
| [ ] | GET | `/api/pipeline/cards/:id/docs.zip` | server/routes/pipeline.ts |
| [ ] | PATCH | `/api/pipeline/cards/:id/move` | server/routes/pipeline.ts |
| [ ] | GET | `/api/pipeline/cards/:id` | server/routes/pipeline.ts |

### Contacts
| Done | Method | Path | Source |
|:----:|:------:|------|--------|
| [ ] | GET | `/api/contacts` | server/index.ts (direct) |

### Communication Hub
| Done | Method | Path | Source |
|:----:|:------:|------|--------|
| [ ] | POST | `/api/voice/events` | server/routes/voice.ts |
| [ ] | POST | `/api/voice/recording-status` | server/routes/recording.webhooks.ts |
| [ ] | POST | `/api/voice/twiml/client-outgoing` | server/routes/voice.ts |
| [ ] | POST | `/api/voice/twiml/conference` | server/routes/voice.ts |
| [ ] | POST | `/api/voice/twiml/conference` | server/routes/voice.ts |
| [ ] | POST | `/api/voice/twiml/incoming` | server/routes/voice.ts |
| [ ] | GET | `/api/voice/twiml/outbound` | server/routes/voice.ts |
| [ ] | POST | `/api/voice/twiml/transfer` | server/routes/voice.ts |
| [ ] | POST | `/api/voice/twiml/transfer` | server/routes/voice.ts |
| [ ] | POST | `/api/voice/twiml/voicemail` | server/routes/voice.ts |
| [ ] | POST | `/api/voice/twiml/voicemail` | server/routes/voice.ts |

### Lenders
| Done | Method | Path | Source |
|:----:|:------:|------|--------|
| [ ] | GET | `/api/lender-auth-test` | server/index.ts (direct) |
| [ ] | POST | `/api/lender-auth` | server/index.ts (direct) |
| [ ] | GET | `/api/lender-directory` | server/index.ts (direct) |
| [ ] | POST | `/api/lender-login` | server/index.ts (direct) |
| [ ] | GET | `/api/lender-products-real/counts` | server/index.ts (direct) |
| [ ] | GET | `/api/lender-products-real` | server/index.ts (direct) |
| [ ] | GET | `/api/lender-products-simple` | server/index.ts (direct) |
| [ ] | POST | `/api/lender-products/sync-external` | server/index.ts (direct) |
| [ ] | GET | `/api/lenders` | server/index.ts (direct) |
| [ ] | GET | `/api/public/lenders-cached` | server/index.ts (direct) |
| [ ] | GET | `/api/public/lenders-fallback` | server/index.ts (direct) |
| [ ] | GET | `/api/public/lenders` | server/index.ts (direct) |
| [ ] | POST | `/api/rbac/auth/lender-login` | server/routes/rbacAuth.ts |
| [ ] | POST | `/api/rbac/auth/lender-login` | server/routes/rbacAuth.ts |

### Conflicts
| Done | Method | Path | Source |
|:----:|:------:|------|--------|
| [ ] | GET | `/api/conflicts-direct/demo` | server/index.ts (direct) |

### Other
| Done | Method | Path | Source |
|:----:|:------:|------|--------|
| [ ] | GET | `/api/_echo` | server/index.ts (direct) |
| [ ] | GET | `/api/_health` | server/index.ts (direct) |
| [ ] | GET | `/api/_routes` | server/index.ts (direct) |
| [ ] | POST | `/api/activate-admin` | server/index.ts (direct) |
| [ ] | POST | `/api/admin/applications/bulk/status` | server/routes/admin/lists.ts |
| [ ] | GET | `/api/admin/applications` | server/routes/admin/lists.ts |
| [ ] | GET | `/api/admin/contacts` | server/routes/admin/lists.ts |
| [ ] | POST | `/api/admin/documents/reassign/:docId` | server/index.ts (direct) |
| [ ] | GET | `/api/admin/search` | server/routes/admin/lists.ts |
| [ ] | DELETE | `/api/applications/:id` | server/index.ts (direct) |
| [ ] | GET | `/api/applications/:id` | server/index.ts (direct) |
| [ ] | GET | `/api/applications` | server/index.ts (direct) |
| [ ] | GET | `/api/applications` | server/index.ts (direct) |
| [ ] | GET | `/api/applications` | server/index.ts (direct) |
| [ ] | GET | `/api/apps/:id` | server/routes/apps.ts |
| [ ] | GET | `/api/apps/` | server/routes/apps.ts |
| [ ] | GET | `/api/auth/__probe` | server/index.ts (direct) |
| [ ] | POST | `/api/auth/change-password` | server/routes/auth/change_password.ts |
| [ ] | POST | `/api/auth/login` | server/routes/auth/session.ts |
| [ ] | POST | `/api/auth/login` | server/routes/auth/password_login.ts |
| [ ] | POST | `/api/auth/logout` | server/routes/auth/session.ts |
| [ ] | POST | `/api/auth/logout` | server/routes/auth/password_login.ts |
| [ ] | GET | `/api/auth/me` | server/routes/auth/session.ts |
| [ ] | GET | `/api/auth/must-change` | server/routes/auth/must_change.ts |
| [ ] | POST | `/api/auth/password/change` | server/routes/auth/password.ts |
| [ ] | POST | `/api/auth/request-2fa` | server/index.ts (direct) |
| [ ] | POST | `/api/auth/verify-2fa` | server/index.ts (direct) |
| [ ] | POST | `/api/bootstrap/seed` | server/routes/bootstrap/seed.ts |
| [ ] | GET | `/api/bootstrap/X-Bootstrap-Token` | server/routes/bootstrap/seed.ts |
| [ ] | POST | `/api/bulletproof-auth/login` | server/routes/bulletproofAuth.ts |
| [ ] | GET | `/api/bulletproof-auth/me` | server/routes/bulletproofAuth.ts |
| [ ] | GET | `/api/bulletproof-auth/status` | server/routes/bulletproofAuth.ts |
| [ ] | GET | `/api/bulletproof/health` | server/index.ts (direct) |
| [ ] | POST | `/api/bulletproof/upload/:applicationId` | server/index.ts (direct) |
| [ ] | GET | `/api/changelog` | server/index.ts (direct) |
| [ ] | POST | `/api/chat/crm-create` | server/index.ts (direct) |
| [ ] | POST | `/api/chat/log-contact` | server/index.ts (direct) |
| [ ] | POST | `/api/chat/sessions` | server/index.ts (direct) |
| [ ] | GET | `/api/clear-cookies` | server/index.ts (direct) |
| [ ] | POST | `/api/conference/bridge` | server/routes/conference.ts |
| [ ] | POST | `/api/conference/enter` | server/routes/conference.ts |
| [ ] | POST | `/api/conference/participants` | server/routes/conference.ts |
| [ ] | POST | `/api/conference/recording-status` | server/routes/conference.ts |
| [ ] | POST | `/api/conference/recording-status` | server/routes/recording.webhooks.ts |
| [ ] | POST | `/api/conference/role` | server/routes/conference.ts |
| [ ] | POST | `/api/conference/start` | server/routes/conference.ts |
| [ ] | POST | `/api/conference/status` | server/routes/conference.ts |
| [ ] | GET | `/api/document-audit` | server/index.ts (direct) |
| [ ] | POST | `/api/email/` | server/routes/email.ts |
| [ ] | GET | `/api/flags/experiments/:key/assign` | server/routes/flags/admin.ts |
| [ ] | POST | `/api/flags/experiments/:key/event` | server/routes/flags/admin.ts |
| [ ] | POST | `/api/flags/experiments/:key/status` | server/routes/flags/admin.ts |
| [ ] | GET | `/api/flags/experiments` | server/routes/flags/admin.ts |
| [ ] | POST | `/api/flags/experiments` | server/routes/flags/admin.ts |
| [ ] | GET | `/api/flags/flags/:key/eval` | server/routes/flags/admin.ts |
| [ ] | POST | `/api/flags/flags/:key/override` | server/routes/flags/admin.ts |
| [ ] | GET | `/api/flags/flags` | server/routes/flags/admin.ts |
| [ ] | POST | `/api/flags/flags` | server/routes/flags/admin.ts |
| [ ] | GET | `/api/health` | server/index.ts (direct) |
| [ ] | GET | `/api/health` | server/index.ts (direct) |
| [ ] | POST | `/api/ops/errors/browser` | server/routes/ops/errors.ts |
| [ ] | GET | `/api/ops/overview` | server/routes/ops/overview.ts |
| [ ] | POST | `/api/ops/queues/:name/:jobId/promote` | server/routes/ops/queues.ts |
| [ ] | POST | `/api/ops/queues/:name/:jobId/remove` | server/routes/ops/queues.ts |
| [ ] | POST | `/api/ops/queues/:name/:jobId/retry` | server/routes/ops/queues.ts |
| [ ] | POST | `/api/ops/queues/:name/drain` | server/routes/ops/queues.ts |
| [ ] | GET | `/api/ops/queues/:name/jobs` | server/routes/ops/queues.ts |
| [ ] | POST | `/api/ops/queues/:name/retry-failed` | server/routes/ops/queues.ts |
| [ ] | GET | `/api/ops/queues/status` | server/routes/ops/queues.ts |
| [ ] | POST | `/api/perf/ingest` | server/routes/perf/vitals.ts |
| [ ] | GET | `/api/perf/latest` | server/routes/perf/vitals.ts |
| [ ] | POST | `/api/public/ai/report-issue` | server/index.ts (direct) |
| [ ] | POST | `/api/public/ai/request-human` | server/index.ts (direct) |
| [ ] | PATCH | `/api/public/application/:applicationId/finalize` | server/index.ts (direct) |
| [ ] | PATCH | `/api/public/applications/:id/finalize` | server/index.ts (direct) |
| [ ] | PATCH | `/api/public/applications/:id/finalize` | server/index.ts (direct) |
| [ ] | POST | `/api/public/applications/test-logging` | server/index.ts (direct) |
| [ ] | POST | `/api/public/applications` | server/index.ts (direct) |
| [ ] | POST | `/api/public/crm/contacts/auto-create` | server/index.ts (direct) |
| [ ] | GET | `/api/public/download-all/:applicationId` | server/index.ts (direct) |
| [ ] | GET | `/api/public/routes` | server/index.ts (direct) |
| [ ] | GET | `/api/public/s3-access/:documentId` | server/index.ts (direct) |
| [ ] | GET | `/api/public/s3-security-check` | server/index.ts (direct) |
| [ ] | POST | `/api/public/s3-upload/:applicationId` | server/index.ts (direct) |
| [ ] | GET | `/api/public/upload-health` | server/index.ts (direct) |
| [ ] | GET | `/api/public/upload-test` | server/index.ts (direct) |
| [ ] | POST | `/api/rbac/auth/login` | server/routes/rbacAuth.ts |
| [ ] | POST | `/api/rbac/auth/logout` | server/routes/rbacAuth.ts |
| [ ] | GET | `/api/rbac/auth/me` | server/routes/rbacAuth.ts |
| [ ] | GET | `/api/rbac/auth/me` | server/routes/rbacAuth.ts |
| [ ] | POST | `/api/rbac/auth/register` | server/routes/rbacAuth.ts |
| [ ] | POST | `/api/rbac/auth/request-sms-otp` | server/routes/rbacAuth.ts |
| [ ] | POST | `/api/rbac/auth/request-sms-otp` | server/routes/rbacAuth.ts |
| [ ] | GET | `/api/rbac/auth/test-debug` | server/routes/rbacAuth.ts |
| [ ] | GET | `/api/rbac/auth/User-Agent` | server/routes/rbacAuth.ts |
| [ ] | GET | `/api/rbac/auth/User-Agent` | server/routes/rbacAuth.ts |
| [ ] | GET | `/api/rbac/auth/User-Agent` | server/routes/rbacAuth.ts |
| [ ] | GET | `/api/rbac/auth/User-Agent` | server/routes/rbacAuth.ts |
| [ ] | DELETE | `/api/rbac/auth/users/:id` | server/routes/rbacAuth.ts |
| [ ] | PATCH | `/api/rbac/auth/users/:id` | server/routes/rbacAuth.ts |
| [ ] | GET | `/api/rbac/auth/users` | server/routes/rbacAuth.ts |
| [ ] | POST | `/api/rbac/auth/verify-otp` | server/routes/rbacAuth.ts |
| [ ] | POST | `/api/rbac/auth/verify-otp` | server/routes/rbacAuth.ts |
| [ ] | POST | `/api/rbac/auth/verify-sms-otp` | server/routes/rbacAuth.ts |
| [ ] | POST | `/api/rbac/auth/verify-token` | server/routes/rbacAuth.ts |
| [ ] | GET | `/api/recs/:appId/pdf` | server/routes/recs.ts |
| [ ] | GET | `/api/recs/:appId` | server/routes/recs.ts |
| [ ] | POST | `/api/releases/:id/archive` | server/routes/releases/admin.ts |
| [ ] | POST | `/api/releases/:id/live` | server/routes/releases/admin.ts |
| [ ] | POST | `/api/releases/:id/stage` | server/routes/releases/admin.ts |
| [ ] | GET | `/api/releases/:id/tasks` | server/routes/releases/admin.ts |
| [ ] | POST | `/api/releases/:id/tasks` | server/routes/releases/admin.ts |
| [ ] | GET | `/api/releases/changelog` | server/routes/releases/admin.ts |
| [ ] | POST | `/api/releases/dismiss/:releaseId` | server/routes/releases/admin.ts |
| [ ] | GET | `/api/releases/` | server/routes/releases/admin.ts |
| [ ] | POST | `/api/releases/` | server/routes/releases/admin.ts |
| [ ] | POST | `/api/releases/tasks/:taskId/run` | server/routes/releases/admin.ts |
| [ ] | GET | `/api/releases/whatsnew` | server/routes/releases/admin.ts |
| [ ] | GET | `/api/s3-debug-direct` | server/index.ts (direct) |
| [ ] | GET | `/api/s3-test-access/:storageKey` | server/index.ts (direct) |
| [ ] | POST | `/api/s3-upload-test` | server/index.ts (direct) |
| [ ] | DELETE | `/api/security/ip-rules/:id` | server/routes/security/controls.ts |
| [ ] | GET | `/api/security/ip-rules` | server/routes/security/controls.ts |
| [ ] | POST | `/api/security/ip-rules` | server/routes/security/controls.ts |
| [ ] | POST | `/api/security/keys/:id/revoke` | server/routes/security/controls.ts |
| [ ] | GET | `/api/security/keys` | server/routes/security/controls.ts |
| [ ] | POST | `/api/security/keys` | server/routes/security/controls.ts |
| [ ] | GET | `/api/security/maintenance` | server/routes/security/controls.ts |
| [ ] | POST | `/api/security/maintenance` | server/routes/security/controls.ts |
| [ ] | GET | `/api/security/ping` | server/routes/security/controls.ts |
| [ ] | GET | `/api/system-validation/status` | server/index.ts (direct) |
| [ ] | GET | `/api/test-s3-upload` | server/index.ts (direct) |
| [ ] | GET | `/api/test-s3` | server/index.ts (direct) |
| [ ] | DELETE | `/api/test/simple-delete` | server/index.ts (direct) |
| [ ] | GET | `/api/unified-auth/debug` | server/routes/unifiedAuth.ts |
| [ ] | GET | `/api/unified-auth/me` | server/routes/unifiedAuth.ts |
| [ ] | GET | `/api/unified-auth/status` | server/routes/unifiedAuth.ts |
| [ ] | GET | `/api/version` | server/index.ts (direct) |
| [ ] | POST | `/auth/login` | server/routes/auth/session.ts |
| [ ] | POST | `/auth/logout` | server/routes/auth/session.ts |
| [ ] | GET | `/auth/me` | server/routes/auth/session.ts |
