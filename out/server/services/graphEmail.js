import { Client } from "@microsoft/microsoft-graph-client";
import { getValidAccessToken } from "./graphAuth";
import { v4 as uuid } from "uuid";
export async function sendUserEmail({ userId, toEmail, subject, htmlBody }) {
    const token = await getValidAccessToken(userId);
    const client = Client.init({ authProvider: (done) => done(null, token) });
    // inject open-tracking pixel
    const trackingId = uuid();
    const pixelUrl = `${process.env.PUBLIC_BASE_URL}/api/graph/email/open/${trackingId}.png`;
    const body = `${htmlBody}\n<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
    const message = {
        subject,
        body: { contentType: "HTML", content: body },
        toRecipients: [{ emailAddress: { address: toEmail } }],
        isReadReceiptRequested: true
    };
    const result = await client.api("/me/sendMail").post({ message, saveToSentItems: true });
    return { result, trackingId };
}
