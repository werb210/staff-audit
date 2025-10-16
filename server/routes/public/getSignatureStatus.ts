import { Router } from 'express';
import { db } from '../../db';
import { applications } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/applications/:id/signature-status', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Checking signature status for application: ${id}`);

    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);

    if (!app) {
      console.log(`❌ Application not found: ${id}`);
      return res.status(404).json({ 
        success: false, 
        error: "Application not found" 
      });
    }

    console.log(`✅ Found application ${id}, signature_status: ${app.signingStatus}`);

    return res.json({
      success: true,
      signature_status: app.signingStatus || "pending",
      document_id: app.signNowDocumentId,
      signed_at: app.signedAt,
      application_id: app.id
    });

  } catch (error: unknown) {
    console.error('❌ Error checking signature status:', error);
    return res.status(500).json({ 
      success: false, 
      error: "Internal server error" 
    });
  }
});

export default router;