# Staff App — Feature Map by Silo & Nav

> Single source of truth for what ships in the clean Staff app. Staff app **only** (no Client app changes). BF = Boreal Financial, SLF = Site Level Financial.

---

## Global (Both Silos)

- **Silo switcher**: instant BF↔SLF swap without duplicate mounts/fetches.
- **Global slide-in dialer**: slides in on incoming call from either silo; **Accept/Decline**; “**View contact/company**” deep link into the correct silo.
- **Human-in-the-loop approvals**: any outbound SMS/email/ad is queued to **+1-587-888-1837**; “yes” sends, “no” holds; declined items remain editable in the contact timeline.
- **Activity timeline & tagging**: log every action (calls/SMS/email/ads/OCR); attach files/recordings/transcripts; tag by type/outcome.
- **Recording & transcription**: calls recorded (when enabled) and transcribed; transcripts attached to contact/application.
- **Tenant isolation & guardrails**: strict API allowlist; single DB pool; mount-once router registry; SPA served after APIs; duplicate-contact prevention (email/phone).

---

## BF Silo

### Dashboard  (`/staff`)
- KPI strip (pipeline totals, conversion, tasks).
- Pipeline snapshot by stage + recent activity feed.
- Dialer/SSE status and queued approvals count.

### Pipeline  (`/staff/pipeline`)
- Kanban board (drag/drop stage change).
- Card metrics & SLA indicators; per-card timeline (calls/SMS/emails/notes).
- Server-logged stage changes + metrics endpoint.
- **Graceful degrade** on malformed data (never crashes).

### Contacts  (`/staff/contacts`)
- Email/phone canonicalization & **continuous dedupe** (case, “+alias”, Gmail dot).
- Unified person view: profile, company, tags, timeline, documents, approvals.
- Search/sort/filter; merge suggestions when duplicates detected.
- Attachments: recordings, transcripts, OCR docs linked to contact/app.

### Lenders  (`/staff/lenders`)
- Lender list with **clean display names** (company_name → displayName).
- Row click → drawer inspector (all fields exposed); **editable form + PATCH**.
- Status normalization; quick filters (active/inactive, category).

### Lender Products  (`/staff/lender-products`)
- Full table of products (search/sort/filter by category, amount, term).
- Drawer: all fields exposed; required-docs preview (when available).
- “Open lender” jump; edit where allowed; **PATCH persists**.

### Applications  (`/staff/applications`)
- List & detail view linked to contact & lender.
- Stage updates (with logging), notes, attachments (OCR docs).
- Never crashes on bad upstream data; clear fail-safe messaging.

### Communication  (`/staff/communication`)
- Compose SMS/email (templates); **approval queue** → send on “yes”.
- Inbox/timeline view per contact/application.
- Drafts, scheduled sends (held until approval), resend/edit flow.

### Calls  (`/staff/calls`)
- Call history with link to contact/application.
- Live dialer pane: Accept/Decline, keypad, notes, disposition, recording toggle.
- Transcription auto-attach; click-through to timeline entries.

### Marketing  (`/staff/marketing`)
- **Connectors now**: Google Ads & LinkedIn Ads (auth, account picker, read-only metrics).
- Audience/segment builder (from Contacts), creative workspace, **draft ads**.
- Activations **require SMS approval** before going live.
- **Planned/flagged**: Twitter/X & others (off by default).

### Settings  (`/staff/settings`)
- Twilio & dialer settings; recording/transcription toggles.
- Ads connectors auth (Google/LinkedIn).
- Dedupe rules, tag taxonomy, templates.
- Diagnostics: DB health, route-audit status, SSE/dialer health.

---

## SLF Silo

### Status  (`/staff/slf/status`)
- Service health (QA API reachability), Twilio number, dialer/SSE status.
- Recent call events; queued approvals.

### Contacts — Company View + Full Dump  (`/staff/slf/contacts`)
- Company-centric table **ingested from external QA API**.
- Search/sort across **all fields**.
- Drawer: **Mapped fields** to Staff schema + **Raw JSON inspector** (verbatim payload).
- **Continuous email dedupe** across imported records.

### Calls  (`/staff/slf/calls`)
- Same live dialer; Accept/Decline; cross-silo slide-in works.
- Call logs, recordings, transcripts; link to company/contact.

### Settings  (`/staff/slf/settings`)
- External API base/token; Twilio settings.
- Import controls & last sync info; diagnostics for SLF endpoints.

---

## Cross-Cutting: OCR & Docs

- **OCR documents registry**: by doc type (bank statements, tax returns, financial statements, business license, quotes), supports **period ranges** and **multi-year** sets.
- Stores parsed fields per your Excel mapping; attached to contact/application; visible in timelines and drawers.
- Required-documents awareness per lender product/category; surfaced in Applications and Lender Products.

---

## Canonical API Surface (DB-backed only; matches Client expectations)

- **Lender products (client shape)**  
  - `GET /api/lenders` — filters: `geography[]`, `product_type`, `min_amount`, `max_amount`, `industries[]`, `lender_name`, `is_active`, `page`, `limit`  
  - `GET /api/lenders/:id`  
  - `GET /api/lenders/categories/summary`  
  - `GET /api/lenders/required-documents/:category`
- **Public applications**  
  - `POST /api/public/applications` — accepts `step1/step3/step4`, upserts Contact, creates Application
- **Staff core**  
  - `/api/health/*`, `/api/pipeline/*`, `/api/contacts*`, `/api/applications*`, `/api/activities*`, `/api/voice/*`, `/api/approvals*`, `/api/messaging/*`, `/api/ads/*`

**Guards**: strict API allowlist; single DB pool; mount-once router registry; SPA after API; JSON 404 for `/api/*`.
