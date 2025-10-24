#!/usr/bin/env bash
set -euo pipefail

# Requires: ripgrep (rg) - available in Replit environment
if ! command -v rg >/dev/null; then 
  echo "❌ ripgrep (rg) not found in PATH"
  echo "💡 This should be available in Replit. Check environment setup."
  exit 1
fi

echo "== DEDUP SCAN =="

fail=0
note() { printf "  - %s\n" "$*"; }
hit()  { printf "❌ %s\n" "$*"; fail=1; }
ok()   { printf "✅ %s\n" "$*"; }

# --- CSP must be defined in ONE place only ---
CANON_CSP="server/middleware/csp.ts"
csp_hits=$(rg -n --hidden -S "Content-Security-Policy|helmet\.contentSecurityPolicy|res\.setHeader\(\s*['\"]Content-Security-Policy" \
  --glob '!.git' --glob '!node_modules' --no-messages || true)
if [ -n "$csp_hits" ]; then
  other=$(echo "$csp_hits" | grep -v "$CANON_CSP" || true)
  if [ -n "$other" ]; then hit "CSP header is set outside $CANON_CSP"; echo "$other"; else ok "CSP only in $CANON_CSP"; fi
else
  hit "No CSP configured (expected in $CANON_CSP)"
fi

# Known bad CSP tokens and misuse
if rg -n --hidden -S "'unsafe-dynamic'" --glob '!node_modules' --no-messages >/dev/null; then
  hit "CSP contains 'unsafe-dynamic' (invalid here). Remove it."
fi
if rg -n --hidden -S "default-src[^;]*report-uri" --glob '!node_modules' --no-messages >/dev/null; then
  hit "CSP has 'report-uri' inside default-src. Must be its own directive."
fi
if rg -n --hidden -S "Content-Security-Policy[^\n]*\/api\/.*\?" --glob '!node_modules' --no-messages >/dev/null; then
  hit "CSP source contains a path/query (invalid). Use origins only."
fi

# --- Router: exactly one provider, no react-router-dom anywhere ---
if rg -n --hidden -S "<BrowserRouter|<HashRouter" client --glob '!node_modules' --no-messages >/dev/null; then
  hit "Multiple/legacy React Router providers found in client/*"
fi
if rg -n --hidden -S "from\s+['\"]react-router-dom['\"]" --glob '!node_modules' --no-messages >/dev/null; then
  hit "Direct react-router-dom imports still exist (wouter is canonical)."
fi

# --- Endpoints that must be singletons ---
AUTH_BASE="/api/auth"
AUTH_SESSION_ROUTE="${AUTH_BASE}/session"
VOICE_BASE="/api/voice"
VOICE_TOKEN_ROUTE="${VOICE_BASE}/token"

for route in "$AUTH_SESSION_ROUTE" "$VOICE_TOKEN_ROUTE" "/api/tasks" "/api/calendar" "/api/user-management"; do
  hits=$(rg -n --hidden -S "$route" server --glob '!node_modules' --no-messages || true)
  count=$(printf "%s" "$hits" | grep -E "router\.|app\." | wc -l | tr -d ' ')
  if [ "$count" -gt 1 ]; then hit "Multiple handlers for $route"; echo "$hits"; else ok "Single handler for $route"; fi
done

# --- Twilio SDK must be referenced from ONE module only ---
TW_ALLOWED="client/src/comm/twilioLoader.ts"

tw_refs=$(rg -n --hidden -S "sdk\\.twilio\\.com/js/client" client --glob '!node_modules' --no-messages || true)
if [ -n "$tw_refs" ]; then
  others=$(echo "$tw_refs" | grep -v "$TW_ALLOWED" || true)
  if [ -n "$others" ]; then
    hit "Twilio SDK referenced outside $TW_ALLOWED"; echo "$others"
  else
    ok "Twilio SDK referenced only by $TW_ALLOWED"
  fi
else
  hit "Twilio SDK not referenced anywhere (dialer will fail to load)"
fi

# No Twilio.Device construction outside the singleton
if rg -n --hidden -S "new\\s+Twilio\\.Device" client --glob '!node_modules' --no-messages | grep -v "client/src/comm/dialer.ts" >/dev/null; then
  hit "Twilio.Device constructed outside client/src/comm/dialer.ts"
else
  ok "Twilio.Device only constructed in dialer singleton"
fi

# --- PWA service worker/manifest: single registration point ---
if [ "$(rg -n --hidden -S "navigator\.serviceWorker\.register\(" client --glob '!node_modules' --no-messages | wc -l | tr -d ' ')" -gt 1 ]; then
  hit "Multiple serviceWorker.register() calls found. There must be exactly one."
fi
if [ "$(rg -n --hidden -S "manifest\.json" --glob '!node_modules' --no-messages | wc -l | tr -d ' ')" -gt 1 ]; then
  note "Multiple manifest references detected. Ensure only one is actually served."
fi

# --- Invalid iframe sandbox flag seen in console ---
if rg -n --hidden -S "allow-downloads-without-user-activation" --glob '!node_modules' --no-messages >/dev/null; then
  hit "Invalid iframe sandbox flag 'allow-downloads-without-user-activation' present."
fi

echo
[ $fail -eq 0 ] && echo "ALL CLEAR ✅" || { echo "FAIL ❌ — fix items above and re-run"; exit 1; }