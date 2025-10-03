// Feature 5: Admin Upload Logs Endpoint
import { Router } from "express";
import { db } from "../db.js";
import { documents } from "../../shared/schema.js";
import { desc } from "drizzle-orm";
import { requireAuth } from "../middleware/rbacAuth.js";

const router = Router();

// Get upload logs with optional filtering
router.get("/", async (req: any, res: any) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const status = req.query.status as string;
    const documentType = req.query.documentType as string;
    
    // Document upload logs temporarily disabled during schema migration
    console.log('Admin upload logs disabled during schema migration');
    const logs = [];
    
    let filteredLogs = logs;
    
    if (status) {
      filteredLogs = filteredLogs.filter(log => log.status === status);
    }
    
    if (documentType) {
      filteredLogs = filteredLogs.filter(log => log.documentType === documentType);
    }
    
    res.json(filteredLogs);
  } catch (error: unknown) {
    console.error("Error fetching upload logs:", error);
    res.status(500).json({ error: "Failed to fetch upload logs" });
  }
});

// Get upload statistics
router.get("/stats", async (req: any, res: any) => {
  try {
    // Document upload logs temporarily disabled during schema migration
    const logs = [];
    console.log('Upload logs stats disabled during schema migration');
    
    const stats = {
      total: logs.length,
      success: logs.filter(log => log.status === "success").length,
      failed: logs.filter(log => log.status === "failed").length,
      recovered: logs.filter(log => log.status === "recovered").length,
      byType: logs.reduce((acc, log) => {
        acc[log.documentType] = (acc[log.documentType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentUploads: logs
        .filter(log => new Date(log.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000)
        .length
    };
    
    res.json(stats);
  } catch (error: unknown) {
    console.error("Error fetching upload statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

export default router;