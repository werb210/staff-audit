mkdir -p server/middleware
cat <<'EOF' > server/middleware/body-parser-fix.js
import express from "express";

export function applyBodyParserFix(app) {
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  console.log("✅ Body parser fix applied");
}
EOF
