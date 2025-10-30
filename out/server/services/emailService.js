import sgMail from '@sendgrid/mail';
// Only initialize SendGrid if API key is present and valid
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('📧 [EMAIL] SendGrid initialized successfully');
}
else {
    console.log('⚠️  [EMAIL] SendGrid API key not configured or invalid - email service disabled');
}
export async function sendEmail({ to, subject, html }) {
    // Check if SendGrid is properly configured
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
        console.error('[EMAIL ERROR] SendGrid API key not configured');
        throw new Error("SendGrid API key not configured - cannot send email");
    }
    if (!process.env.SENDGRID_FROM_EMAIL) {
        console.error('[EMAIL ERROR] SENDGRID_FROM_EMAIL not configured');
        throw new Error("SENDGRID_FROM_EMAIL not configured - cannot send email");
    }
    const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject,
        html
    };
    try {
        const result = await sgMail.send(msg);
        console.log('[EMAIL SUCCESS] Email sent successfully to:', to);
        return result;
    }
    catch (err) {
        console.error("[EMAIL ERROR]", err.response?.body || err);
        throw new Error("Email failed to send");
    }
}
