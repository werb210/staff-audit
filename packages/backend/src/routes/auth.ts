import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { storage } from "../storage.js";

const router = Router();

router.get('/user', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

export default router;
