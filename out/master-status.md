# Master Status (post-rollback audit)

## Tabs & Major UI
- Dashboard: ✅
- Sales Pipeline board: ✅
- Pipeline application drawer (tabs: App/Bank/Fin/Docs/Lenders): ✅
- Contacts (3-pane): ✅
- Communications Hub (Voice/SMS/Email): ✅
- Lenders & Products: ✅
- Settings (Users/Roles/Flags/Providers): ✅
- Marketing tab (present in code): ✅
  - LinkedIn flag enabled: OFF (archived)
  - Segment flag enabled: OFF (archived)

## Server Feature Hints (from server/index.ts)
- /api/pipeline or /api/applications endpoints: ~5 routes
- /api/contacts endpoints: ~1 routes
- /api/lenders endpoints: ~10 routes
- /api/documents or /api/public/* endpoints: ~18
- /api/voice endpoints: ~0
- /api/conversations|/api/chat|/api/sms endpoints: ~3
- /api/o365|/api/email endpoints: ~0
- /api/flags endpoints: ~0
- /api/auth|/api/otp|/api/verify endpoints: ~3
- /api/linkedin endpoints (should be parked by guard): ~0
- /api/segment|/api/analytics endpoints (should be parked): ~0

## Interpret this vs Master List
- **Sales Pipeline**: board + drawer must open, DnD stable, Docs tab shows preview+reupload; any ❌ above means we need to re-install the drawer pack.
- **Contacts**: 3-pane (list/form/timeline) present & hitting real endpoints; if ❌ we'll re-ship the hub.
- **Comms Hub**: Voice/SMS/Email panes present; if ❌ we'll re-ship v2.
- **Lenders**: CRUD wired to real columns; if counts low or UI missing fields, we'll sync forms to DB.
- **Settings**: Users/Roles/Flags/Providers present; if ❌ we'll re-ship the Settings pack.
- **Marketing**: Archived by design; re-enable later with flags + OAuth.
