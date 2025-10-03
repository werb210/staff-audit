import { communicationsDB } from "../lib/communicationsStore";

const BASE_URL = process.env.STAFF_BASE || process.env.PUBLIC_BASE || "https://staff.boreal.financial";

export async function sendTrackedEmail(opts: {
  contactId: string;
  to: string;
  subject: string;
  html: string;
  templateId?: string;
  from?: string;
}) {
  // Get email settings
  const emailSettings = communicationsDB.getEmailSettings();
  
  // Create communication record first to get ID for tracking
  const comm = communicationsDB.addCommunication({
    contactId: opts.contactId,
    type: "email",
    direction: "outbound",
    subject: opts.subject,
    body: opts.html,
    status: "queued",
    meta: {
      to: opts.to,
      templateId: opts.templateId,
      trackingEnabled: emailSettings.trackingEnabled
    }
  });

  let finalHtml = opts.html;

  // Add signature if configured
  if (emailSettings.signatureHtml) {
    finalHtml += `<hr/>${emailSettings.signatureHtml}`;
  }

  // Add tracking if enabled
  if (emailSettings.trackingEnabled) {
    // Add open tracking pixel
    const pixelUrl = `${BASE_URL}/api/tracking/open/${comm.id}.gif`;
    finalHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`;

    // Replace links with tracked versions
    finalHtml = finalHtml.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match, url) => `href="${BASE_URL}/api/tracking/click/${comm.id}?url=${encodeURIComponent(url)}"`
    );
  }

  try {
    // Demo mode: Log email without actually sending
    console.log(`📧 [EMAIL-DEMO] To: ${opts.to}, Subject: ${opts.subject}`);
    console.log(`📧 [EMAIL-DEMO] Tracking: ${emailSettings.trackingEnabled ? 'Enabled' : 'Disabled'}`);
    
    // Update status to sent
    communicationsDB.updateCommunication(comm.id, { 
      status: "sent",
      body: finalHtml 
    });

    return {
      communicationId: comm.id,
      trackingEnabled: emailSettings.trackingEnabled,
      message: "Email sent successfully (demo mode)"
    };
  } catch (error) {
    // Update status to failed
    communicationsDB.updateCommunication(comm.id, { 
      status: "failed",
      meta: { ...comm.meta, error: String(error) }
    });
    throw error;
  }
}