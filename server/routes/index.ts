#!/bin/bash
set -euo pipefail
echo "🧹 Cleaning up duplicate router declarations in server/routes/index.ts..."

cat > server/routes/index.ts <<'EOF'
import express from "express";
import analyticsRouter from "./analytics/index.js";
import clientRouter from "./client/index.js";
import staffRouter from "./staff/index.js";
import twilioRouter from "./twilio/index.js";

const router = express.Router();

router.use("/analytics", analyticsRouter);
router.use("/client", clientRouter);
router.use("/staff", staffRouter);
router.use("/twilio", twilioRouter);

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    routes: ["analytics", "client", "staff", "twilio"],
  });
});

export default router;
EOF

echo "✅ server/routes/index.ts rebuilt successfully."

pkill -f "tsx" || true
pkill -f "node.*3001" || true
echo "🚀 Restarting server..."
npx tsx server/index.ts
