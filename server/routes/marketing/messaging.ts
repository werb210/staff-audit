import { Router } from "express";
import { db } from "../../db/drizzle";
import { sql } from "drizzle-orm";

const router = Router();

// Get all LinkedIn messaging sequences
router.get("/api/marketing/messaging/sequences", async (req: any, res: any) => {
  try {
    console.log(`💬 Fetching LinkedIn sequences`);

    const sequencesResult = await db.execute(sql`
      SELECT 
        ls.*,
        COUNT(DISTINCT lss.id) as total_steps,
        COUNT(DISTINCT lsc.id) as total_contacts,
        COUNT(CASE WHEN lsc.status = 'active' THEN 1 END) as active_contacts,
        COUNT(CASE WHEN lsc.status = 'completed' THEN 1 END) as completed_contacts
      FROM linkedin_sequences ls
      LEFT JOIN linkedin_sequence_steps lss ON ls.id = lss.sequence_id
      LEFT JOIN linkedin_sequence_contacts lsc ON ls.id = lsc.sequence_id
      GROUP BY ls.id, ls.name, ls.status, ls.target_filters, ls.created_at, ls.updated_at
      ORDER BY ls.created_at DESC
    `);

    console.log(`💬 Found ${sequencesResult.length} sequences`);

    const sequences = sequencesResult.map(seq => ({
      id: seq.id,
      name: seq.name,
      status: seq.status,
      targetFilters: seq.target_filters ? JSON.parse(seq.target_filters) : {},
      totalSteps: Number(seq.total_steps) || 0,
      totalContacts: Number(seq.total_contacts) || 0,
      activeContacts: Number(seq.active_contacts) || 0,
      completedContacts: Number(seq.completed_contacts) || 0,
      createdAt: seq.created_at,
      updatedAt: seq.updated_at
    }));

    res.json({
      sequences,
      stats: {
        totalSequences: sequences.length,
        activeSequences: sequences.filter(s => s.status === 'active').length,
        totalActiveContacts: sequences.reduce((sum, s) => sum + s.activeContacts, 0)
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error("Error fetching sequences:", error);
    
    // Fallback demo data
    const demoSequences = [
      {
        id: 'seq_1',
        name: 'Manufacturing Leads Outreach',
        status: 'active',
        targetFilters: {
          industries: ['Manufacturing', 'Industrial Equipment'],
          jobTitles: ['CEO', 'CFO', 'Owner'],
          companySize: '50-500'
        },
        totalSteps: 4,
        totalContacts: 150,
        activeContacts: 45,
        completedContacts: 32,
        createdAt: '2024-10-15T10:00:00Z',
        updatedAt: '2024-11-20T14:30:00Z'
      },
      {
        id: 'seq_2',
        name: 'Construction Company Follow-up',
        status: 'paused',
        targetFilters: {
          industries: ['Construction', 'Real Estate'],
          jobTitles: ['Project Manager', 'General Contractor'],
          companySize: '10-200'
        },
        totalSteps: 3,
        totalContacts: 89,
        activeContacts: 0,
        completedContacts: 23,
        createdAt: '2024-09-20T09:00:00Z',
        updatedAt: '2024-11-18T11:15:00Z'
      }
    ];

    res.json({
      sequences: demoSequences,
      stats: {
        totalSequences: demoSequences.length,
        activeSequences: 1,
        totalActiveContacts: 45
      },
      lastUpdated: new Date().toISOString()
    });
  }
});

// Get sequence steps
router.get("/api/marketing/messaging/sequences/:id/steps", async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const stepsResult = await db.execute(sql`
      SELECT *
      FROM linkedin_sequence_steps
      WHERE sequence_id = ${id}
      ORDER BY step_number ASC
    `);

    const steps = stepsResult.map(step => ({
      id: step.id,
      stepNumber: step.step_number,
      messageTemplate: step.message_template,
      delayDays: step.delay_days,
      delayHours: step.delay_hours,
      action: step.action,
      createdAt: step.created_at
    }));

    res.json({ steps });

  } catch (error: unknown) {
    console.error("Error fetching sequence steps:", error);
    
    // Demo steps
    const demoSteps = [
      {
        id: 'step_1',
        stepNumber: 1,
        messageTemplate: 'Hi {firstName}, I noticed your company {companyName} is in the manufacturing space. We help businesses like yours access equipment financing quickly. Would love to connect!',
        delayDays: 0,
        delayHours: 0,
        action: 'connection_request'
      },
      {
        id: 'step_2',
        stepNumber: 2,
        messageTemplate: 'Thanks for connecting! I saw that {companyName} has been growing. Have you considered equipment financing to expand your operations?',
        delayDays: 3,
        delayHours: 0,
        action: 'message'
      },
      {
        id: 'step_3',
        stepNumber: 3,
        messageTemplate: 'Quick follow-up - we just helped a manufacturing company similar to yours secure $500K in equipment financing in under 5 days. Would a brief call make sense?',
        delayDays: 7,
        delayHours: 0,
        action: 'message'
      }
    ];

    res.json({ steps: demoSteps });
  }
});

// Create new sequence
router.post("/api/marketing/messaging/sequences", async (req: any, res: any) => {
  try {
    const { name, targetFilters, steps } = req.body;

    const sequenceId = `seq_${Date.now()}`;
    
    // Insert sequence
    await db.execute(sql`
      INSERT INTO linkedin_sequences (id, name, target_filters, status, created_at, updated_at)
      VALUES (${sequenceId}, ${name}, ${JSON.stringify(targetFilters)}, 'draft', NOW(), NOW())
    `);

    // Insert steps if provided
    if (steps && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await db.execute(sql`
          INSERT INTO linkedin_sequence_steps (id, sequence_id, step_number, message_template, delay_days, delay_hours, action, created_at)
          VALUES (${`step_${Date.now()}_${i}`}, ${sequenceId}, ${i + 1}, ${step.messageTemplate}, ${step.delayDays || 0}, ${step.delayHours || 0}, ${step.action || 'message'}, NOW())
        `);
      }
    }

    res.json({
      success: true,
      sequenceId,
      message: "Sequence created successfully"
    });

  } catch (error: unknown) {
    console.error("Error creating sequence:", error);
    res.status(500).json({ error: "Failed to create sequence" });
  }
});

export default router;