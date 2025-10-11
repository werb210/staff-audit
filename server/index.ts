#!/bin/bash
# === PATCH: Fix JSON truncation in Staff App (client → staff field loss) ===
# Target file: server/index.ts

# 1️⃣ Create improved parser patch
mkdir -p patches

cat > patches/fix-body-parser.ts <<'EOF'
import express from "express";

/**
 * 🧩 Enhanced Body Parser
 * Expands JSON + URL encoding limits to preserve all nested form data (up to 20 MB, 208+ fields)
 * and logs every large inbound POST for debugging.
 */
export function applyBodyParserFix(app: express.Application) {
  // Override defaults
  app.use(express.json({ limit: "20mb", strict: false }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

  // Debug: show field count + payload size
  app.use((req, _res, next) => {
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try {
        const size = JSON.stringify(req.body || {}).length;
        const count =
          req.body && typeof req.body === "object"
            ? Object.keys(req.body).length
            : 0;
        console.log(
          `🧩 [BodyParser] ${req.method} ${req.path} — ${size} bytes, ${count} fields`
        );
        if (count < 20)
          console.warn(
            "⚠️ [BodyParser] Low field count — possible truncated JSON or missing nested data"
          );
      } catch (err) {
        console.error("❌ [BodyParser] Logging error:", err);
      }
    }
    next();
  });
}
EOF

# 2️⃣ Inject into server/index.ts
# Add these two lines *immediately after* the line:
#   const app = express();

echo "⚙️  Add below to server/index.ts right after 'const app = express();'"
echo ""
echo "import { applyBodyParserFix } from './patches/fix-body-parser';"
echo "applyBodyParserFix(app);"
echo ""
echo "🚀 Then comment out or delete the old lines:"
echo "  app.use(express.json({ limit: '5mb', strict: true, type: ['application/json', 'application/csp-report'] }));"
echo "  app.use(express.urlencoded({ extended: true, limit: '5mb' }));"

# 3️⃣ Restart the staff server after editing.
echo ""
echo "✅ After restart, run the following test to verify parsing:"
cat <<'CURL'
curl -X POST http://localhost:3001/api/v1/applications \
  -H "Content-Type: application/json" \
  -d @<(jq -n '{'$(for i in {1..208}; do echo "\"field$i\":\"test$i\","; done | sed "$ s/,$//")'}')
CURL
