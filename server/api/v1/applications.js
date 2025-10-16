import { Router } from "express";
const router = Router();

router.post("/", async (req, res) => {
  const { business_name, status } = req.body;
  res.json({
    id: "test-" + Date.now(),
    business_name,
    status,
  });
});

export default router;
