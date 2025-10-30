import { MailService } from '@sendgrid/mail';
if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY environment variable must be set");
}
const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);
export async function sendEmail(apiKey, params) {
    try {
        await mailService.send({
            to: params.to,
            from: params.from,
            subject: params.subject,
            text: params.text,
            html: params.html,
        });
        return true;
    }
    catch (error) {
        console.error('SendGrid email error:', error);
        return false;
    }
}
