# ⚙️ OPERATIONAL STABILIZATION BLOCK (OSB)
_Target: Both Staff and Client apps 100% functional_

---

## I. BACKEND / STAFF SERVER
**Objective:** make the Express + TypeScript API start, serve all routes, and talk to the DB.

### 1. Startup
- [ ] Run `npm ci`
- [ ] Run `npm run dev:server`
- [ ] Confirm no TypeScript or import errors
- [ ] Fix `vite.config` references if present in server code

### 2. Core health
- [ ] Open `http://localhost:5000/api/health` → expect `{"status":"ok"}`
- [ ] Check logs for “CORS” or “missing env” warnings
- [ ] Verify `.env` file contains:
- [ ] - [ ] Confirm database migration runs: `npm run db:push`

### 3. Routing audit
- [ ] `/api/auth/login` → returns 200
- [ ] `/api/applications` → returns JSON list
- [ ] `/api/documents` → 200 and uploads file to S3
- [ ] `/api/pipeline/cards` → returns card list
- [ ] `/api/ocr/analyze` → returns placeholder response (no crash)

### 4. Security & middleware
- [ ] `helmet`, `cors`, `cookie-parser`, `rate-limit` installed
- [ ] `authJwt.ts` validates token + roles
- [ ] Cookies have `HttpOnly; Secure; SameSite=None`

### 5. File system / S3
- [ ] Test one upload → verify appears in S3 bucket
- [ ] Test one download → verify checksum or file opens

---

## II. FRONTEND / STAFF APP
**Objective:** confirm UI renders and all sidebar modules respond.

### 1. Build & run
- [ ] Run `npm run dev:client`
- [ ] Open `http://localhost:5173`
- [ ] Sidebar loads with all sections visible (Pipeline, CRM, Documents, Reports)

### 2. Navigation check
- [ ] Click every sidebar item → route loads (no blank screen)
- [ ] Pipeline cards render; clicking opens detail drawer
- [ ] “Documents” tab lists uploaded files with Preview / Download buttons working

### 3. Communication modules
- [ ] SMS tab loads conversation list
- [ ] Call tab lists recent calls (even if dummy data)
- [ ] Email tab loads template view

### 4. Auth
- [ ] Login screen accepts default credentials
- [ ] Session persists on page reload

---

## III. CLIENT APP
**Objective:** verify full 7-step flow and document upload → staff backend.

### 1. Startup
- [ ] Run `npm ci && npm run dev`
- [ ] Open `http://localhost:5173` (or assigned port)

### 2. Form sequence
- [ ] Step 1 – KYC → works
- [ ] Step 2 – Lender recommendation → loads
- [ ] Step 3 – Business info → submits
- [ ] Step 4 – Applicant info → validates
- [ ] Step 5 – Upload → choose PDF → shows progress → success toast
- [ ] Step 6 – Terms & Signature → submit → success page

### 3. Transmission
- [ ] Verify Staff App receives new application card
- [ ] Uploaded file visible under same app ID

### 4. CORS check
- [ ] Open dev console → no “CORS policy” or “Network Error” messages
- [ ] Staff API URL in `.env` ends with `/api` and matches running backend

---

## IV. INTEGRATION VERIFICATION

| Component | Test | Result |
|------------|------|--------|
| Application submission | Client → Staff | ✅ |
| Document upload | Client → S3 | ✅ |
| Pipeline display | Staff UI | ✅ |
| Document preview | Staff → S3 | ✅ |
| Login / Session | Both apps | ✅ |

---

## V. FINAL SMOKE TEST

Run:
```bash
curl -i http://localhost:5000/api/health
npm run test:smoke
