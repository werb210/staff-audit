#!/usr/bin/env bash
set -euo pipefail
AUDIT_AT="$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p reports/audit-$AUDIT_AT && R="reports/audit-$AUDIT_AT"
echo "🔎 Staff audit -> $R"

# 0) Quick context
echo "branch: $(git rev-parse --abbrev-ref HEAD)" | tee "$R/00_context.txt"
echo "last commit: $(git log -1 --pretty=%h'  '%s)" | tee -a "$R/00_context.txt"

# 1) List all Express mounts & routes
rg -nS "app\.use\(|router\.(get|post|put|patch|delete)\(" server | tee "$R/10_routes_raw.txt" >/dev/null

# 1a) Normalize [METHOD PATH] lines for de-dup checks
awk '
  /router\.(get|post|put|patch|delete)\(/ {
    m=toupper($0); sub(/^.*ROUTER\./,"",m); gsub(/\).*/,"",m);
    gsub(/\(/," ",m);
    gsub(/['"'"'"`]/,"",m);
    print m
  }
  /app\.use\(/ {
    u=$0; gsub(/^.*app\.use\(/,"",u); gsub(/\).*/,"",u);
    gsub(/['"'"'"`]/,"",u); print "USE " u
  }
' "$R/10_routes_raw.txt" | sed 's/,/ /g' | awk '{$1=$1}1' | tee "$R/11_routes_norm.txt" >/dev/null

# 1b) Summaries
echo "---- ROUTE METHOD COUNTS ----" | tee "$R/12_routes_summary.txt"
cut -d' ' -f1 "$R/11_routes_norm.txt" | sort | uniq -c | sort -nr | tee -a "$R/12_routes_summary.txt"
echo -e "\n---- POSSIBLE DUPLICATES (same METHOD+PATH) ----" | tee -a "$R/12_routes_summary.txt"
awk '{print toupper($0)}' "$R/11_routes_norm.txt" | sort | uniq -d | tee -a "$R/12_routes_summary.txt" || true

# 2) CORS + auth allowlists (to catch mismatches that block UI)
{ rg -nS "cors|ALLOW|ORIGIN|credential" server || true; } | tee "$R/20_cors_auth.txt" >/dev/null
{ rg -nS "CLIENT_SHARED_BEARER|bearer|Authorization" server || true; } | tee -a "$R/20_cors_auth.txt" >/dev/null

# 3) Find duplicate filenames & near-duplicate files
git ls-files | awk -F/ '{print $NF}' | sort | uniq -d | tee "$R/30_dupe_filenames.txt" >/dev/null || true
# content duplicates by checksum (fast, may be none)
git ls-files | xargs -I{} sh -c 'sha1sum "{}"' | sort | awk '{print $1}' | uniq -d > "$R/.dupe_hashes" || true
echo "---- content duplicate hashes ----" | tee "$R/31_dupe_content.txt"
while read -r h; do
  echo "# $h" >> "$R/31_dupe_content.txt"
  git ls-files | xargs -I{} sh -c 'sha1sum "{}"' | awk -v H="$h" '$1==H{print $2}' >> "$R/31_dupe_content.txt"
done < "$R/.dupe_hashes" || true
rm -f "$R/.dupe_hashes"

# 4) APIs the UI likely calls (to match against server routes)
rg -nS "/api/" client public dist | tee "$R/40_client_calls.txt" >/dev/null || true

# 5) Known critical pages/routes sanity (pipeline card, users)
echo "GET /api/pipeline/board"  > "$R/50_live_get_list.txt"
echo "GET /api/users"          >> "$R/50_live_get_list.txt"
echo "GET /api/lenders"        >> "$R/50_live_get_list.txt"
echo "GET /api/v1/products"    >> "$R/50_live_get_list.txt"
echo "GET /api/required-docs"  >> "$R/50_live_get_list.txt"

BASE="${BASE:-https://staff.boreal.financial/api}"
TOK="${CLIENT_SHARED_BEARER:-$CLIENT_SHARED_BEARER}"

echo "BASE=$BASE" | tee "$R/51_live_probe_results.txt"
echo "Token fp (sha256/12): $(node -e 'const c=require(\"crypto\");const s=process.env.CLIENT_SHARED_BEARER||\"\";console.log(c.createHash(\"sha256\").update(s).digest(\"hex\").slice(0,12))')" | tee -a "$R/51_live_probe_results.txt"

while read -r line; do
  m=$(echo "$line" | awk '{print $1}'); p=$(echo "$line" | awk '{print $2}')
  [ -z "$p" ] && continue
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOK" "$BASE$p" || echo "000")
  echo "$m $p -> $code" | tee -a "$R/51_live_probe_results.txt"
done < "$R/50_live_get_list.txt"

# 6) Write a human summary
{
  echo "### Staff audit @ $AUDIT_AT"
  echo "- Routes raw: $R/10_routes_raw.txt"
  echo "- Routes normalized: $R/11_routes_norm.txt"
  echo "- Route summary & duplicates: $R/12_routes_summary.txt"
  echo "- CORS/Auth snippets: $R/20_cors_auth.txt"
  echo "- Duplicate filenames: $R/30_dupe_filenames.txt"
  echo "- Duplicate content:  $R/31_dupe_content.txt"
  echo "- Client API calls seen: $R/40_client_calls.txt"
  echo "- Live probe results:  $R/51_live_probe_results.txt"
} | tee "$R/README.md"

echo "✅ Staff audit done. Open $R/README.md"