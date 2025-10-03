#!/bin/bash
set -euo pipefail

echo "=== Auto-Fix Import Paths (portable) ==="

# Mapping old dirs → canonical keepers
MAPPING="
documentaudit:documents
documentintegrity:documents
documentnormalization:documents
documentrecovery:documents
documentrepair:documents
documentvalidation:documents
documentversioning:documents

lenders:lender
lenderproduct:lender
lenderproducts:lender
lenderreports:lender
lender2fa:lender

s3test:s3
s3upload:s3
storagetest:s3
objectstorage:s3
"

# Scan dirs
SCAN_DIRS="server client"

for dir in $SCAN_DIRS; do
  if [ -d "$dir" ]; then
    echo "--- Scanning $dir ---"
    while IFS=":" read -r old new; do
      [ -z "$old" ] && continue  # skip blanks
      echo "Fixing imports: $old → $new"
      grep -rl --include="*.ts" --include="*.tsx" --include="*.js" --include="*.cjs" --include="*.mjs" "$old" "$dir" \
        | xargs sed -i '' -e "s#$old#$new#g" || true
    done <<< "$MAPPING"
  fi
done

echo "✅ Import path rewrite complete. Run build/tests to confirm."
