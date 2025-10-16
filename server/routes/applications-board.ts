import { Router } from "express";

const router = Router();

// Mock data for BF pipeline board (until database is properly connected)
const mockBfApplications = [
  {
    id: "bf-app-1",
    business: "Tech Solutions Inc",
    amount: 150000,
    stage: "New",
    updatedAt: "2025-08-10T16:30:00Z",
    status: "active",
    silo: "BF"
  },
  {
    id: "bf-app-2", 
    business: "Manufacturing Co",
    amount: 250000,
    stage: "In Review",
    updatedAt: "2025-08-10T15:45:00Z",
    status: "active",
    silo: "BF"
  },
  {
    id: "bf-app-3",
    business: "Retail Group",
    amount: 100000,
    stage: "Requires Documents",
    updatedAt: "2025-08-10T14:20:00Z",
    status: "active",
    silo: "BF"
  },
  {
    id: "bf-app-4",
    business: "Service Corp",
    amount: 200000,
    stage: "Off to Lender",
    updatedAt: "2025-08-10T13:10:00Z",
    status: "active",
    silo: "BF"
  },
  {
    id: "bf-app-5",
    business: "Construction LLC",
    amount: 350000,
    stage: "Accepted",
    updatedAt: "2025-08-10T12:05:00Z",
    status: "active",
    silo: "BF"
  }
];

/**
 * GET /api/applications/board
 * Get applications formatted for pipeline board view (BF silo)
 */
router.get("/board", async (req: any, res: any) => {
  try {
    console.log('📋 [BF-BOARD] Fetching BF applications for pipeline board...');
    
    // For now, return mock data with proper structure
    const boardData = mockBfApplications.map(app => ({
      id: app.id,
      business: app.business,
      amount: app.amount,
      stage: app.stage,
      updatedAt: app.updatedAt,
      status: app.status
    }));

    console.log(`📋 [BF-BOARD] Returning ${boardData.length} BF applications`);
    res.json(boardData);

  } catch (error: unknown) {
    console.error('❌ [BF-BOARD] Error fetching board data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load pipeline board'
    });
  }
});

export default router;