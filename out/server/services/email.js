import sg from "@sendgrid/mail";
sg.setApiKey(process.env.SENDGRID_API_KEY);
export async function sendEmail(args) {
    const from = process.env.SENDGRID_DEFAULT_FROM;
    const replyTo = process.env.SENDGRID_DEFAULT_REPLYTO;
    const msg = { from, to: args.to, replyTo };
    if (args.templateId) {
        msg.templateId = args.templateId;
        msg.dynamicTemplateData = args.dynamicTemplateData || {};
    }
    else {
        msg.subject = args.subject;
        msg.html = args.html;
        msg.text = args.text;
    }
    return sg.send(msg);
}
