import sg from "@sendgrid/mail";
sg.setApiKey(process.env.SENDGRID_API_KEY!);

type SendArgs = {
  to: string; subject?: string; html?: string; text?: string;
  templateId?: string; dynamicTemplateData?: Record<string, any>;
};

export async function sendEmail(args: SendArgs) {
  const from = process.env.SENDGRID_DEFAULT_FROM!;
  const replyTo = process.env.SENDGRID_DEFAULT_REPLYTO;
  const msg: any = { from, to: args.to, replyTo };
  if (args.templateId) {
    msg.templateId = args.templateId;
    msg.dynamicTemplateData = args.dynamicTemplateData || {};
  } else {
    msg.subject = args.subject; msg.html = args.html; msg.text = args.text;
  }
  return sg.send(msg);
}