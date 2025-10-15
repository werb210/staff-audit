cat <<'EOF' > server/api/v1/applications.js
import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  const { business_name, status } = req.body;
  if (!business_name) {
    return res.status(400).json({ error: "Missing business_name" });
  }
  const id = Math.random().toString(36).substring(2, 10);
  res.json({ id, business_name, status, created_at: new Date().toISOString() });
});

export default router;
EOF
