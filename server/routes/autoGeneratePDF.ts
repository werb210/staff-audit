/**
 * Auto-trigger PDF generation when applications are submitted
 */

import { generateSignedApplicationPDF } from "../utils/pdfGenerator";

/**
 * Auto-generate PDF for newly submitted applications
 */
export async function autoGeneratePDF(applicationId: string, application: any): Promise<string | null> {
  try {
    console.log(`🔄 [AUTO-PDF] Auto-generating PDF for application ${applicationId}`);
    
    // Check if application has form_data
    if (!application.form_data && !application.formData) {
      console.log(`⚠️ [AUTO-PDF] Skipping PDF generation - no form data available`);
      return null;
    }
    
    // Generate PDF automatically
    const storageKey = await generateSignedApplicationPDF(application);
    console.log(`✅ [AUTO-PDF] PDF auto-generated successfully: ${storageKey}`);
    
    return storageKey;
    
  } catch (error: unknown) {
    console.error(`❌ [AUTO-PDF] Auto-generation failed for ${applicationId}:`, error);
    // Don't throw error - PDF generation failure shouldn't break submission
    return null;
  }
}

/**
 * Integration hook for application submission endpoint
 */
export function integrateAutoPDFGeneration() {
  return {
    name: "Auto PDF Generation",
    description: "Automatically generates signed application PDFs",
    trigger: "post-submission",
    handler: autoGeneratePDF
  };
}