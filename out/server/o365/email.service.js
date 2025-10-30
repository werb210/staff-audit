import { graphForUser, logGraph } from "./graphClient";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({ region: process.env.S3_REGION });
export async function sendEmail(userId, message, opts) {
    const client = await graphForUser(userId);
    const sendPath = opts?.fromShared && process.env.MS_SHARED_MAILBOX
        ? `/users/${encodeURIComponent(process.env.MS_SHARED_MAILBOX)}/sendMail`
        : `/me/sendMail`;
    const body = {
        message: {
            subject: message.subject,
            body: {
                contentType: message.html ? "HTML" : "Text",
                content: message.html || message.text || ""
            },
            toRecipients: message.to.map(address => ({ emailAddress: { address } })),
            ccRecipients: (message.cc || []).map(address => ({ emailAddress: { address } })),
            bccRecipients: (message.bcc || []).map(address => ({ emailAddress: { address } })),
            attachments: (message.attachments || []).map(attachment => ({
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: attachment.filename,
                contentType: attachment.contentType,
                contentBytes: attachment.contentBase64
            }))
        },
        saveToSentItems: true
    };
    try {
        await client.api(sendPath).post(body);
        await logGraph(userId, "mail.send", message.to.join(","));
        // TODO: Insert into email_logs table
        console.log(`[O365-EMAIL] Sent email to ${message.to.join(",")} from user ${userId}`);
    }
    catch (error) {
        await logGraph(userId, "mail.send", message.to.join(","), false, error?.message);
        throw error;
    }
}
export async function fetchNewInbox(userId, opts) {
    const client = await graphForUser(userId);
    const base = opts?.useShared && process.env.MS_SHARED_MAILBOX
        ? `/users/${encodeURIComponent(process.env.MS_SHARED_MAILBOX)}`
        : `/me`;
    try {
        // Fetch latest 25 messages in Inbox
        const response = await client
            .api(`${base}/mailFolders/Inbox/messages`)
            .top(25)
            .select("id,subject,from,toRecipients,ccRecipients,hasAttachments,conversationId,createdDateTime,receivedDateTime")
            .orderby("receivedDateTime DESC")
            .get();
        for (const message of response.value || []) {
            // TODO: Resolve contact by email address
            const contactId = await resolveContactByEmail(message.from?.emailAddress?.address);
            // TODO: Insert into email_logs table
            const emailLogId = await upsertEmailLog({
                direction: "inbound",
                userId,
                contactId,
                subject: message.subject,
                fromAddr: message.from?.emailAddress?.address,
                toAddrs: (message.toRecipients || []).map((r) => r.emailAddress.address),
                ccAddrs: (message.ccRecipients || []).map((r) => r.emailAddress.address),
                messageId: message.id,
                threadId: message.conversationId,
                graphId: message.id,
                hasAttachments: !!message.hasAttachments
            });
            // Process attachments if present
            if (message.hasAttachments) {
                await processEmailAttachments(client, base, message.id, emailLogId);
            }
        }
        await logGraph(userId, "mail.read", "Inbox");
    }
    catch (error) {
        await logGraph(userId, "mail.read", "Inbox", false, error?.message);
        throw error;
    }
}
async function processEmailAttachments(client, basePath, messageId, emailLogId) {
    try {
        const attachments = await client.api(`${basePath}/messages/${messageId}/attachments`).get();
        for (const attachment of attachments.value || []) {
            if (attachment["@odata.type"] === "#microsoft.graph.fileAttachment") {
                const s3Key = `emails/${messageId}/${attachment.name}`;
                // Upload to S3
                await s3.send(new PutObjectCommand({
                    Bucket: process.env.S3_BUCKET,
                    Key: s3Key,
                    Body: Buffer.from(attachment.contentBytes, "base64"),
                    ContentType: attachment.contentType || "application/octet-stream",
                    ServerSideEncryption: "AES256"
                }));
                // TODO: Insert into email_attachments table
                await insertEmailAttachment(emailLogId, {
                    filename: attachment.name,
                    mimeType: attachment.contentType,
                    sizeBytes: attachment.size || null,
                    s3Key
                });
                console.log(`[O365-EMAIL] Attachment ${attachment.name} saved to S3: ${s3Key}`);
            }
        }
    }
    catch (error) {
        console.error("[O365-EMAIL] Failed to process attachments:", error);
    }
}
// TODO: Implement these functions with your actual database calls
async function resolveContactByEmail(email) {
    if (!email)
        return null;
    // Search contacts table for matching email
    console.log(`[O365-EMAIL] Resolving contact for email: ${email} - TODO: implement DB lookup`);
    return null;
}
async function upsertEmailLog(data) {
    // Insert into email_logs table
    console.log(`[O365-EMAIL] Upserting email log - TODO: implement DB insert`);
    return "placeholder-email-log-id";
}
async function insertEmailAttachment(emailLogId, data) {
    // Insert into email_attachments table
    console.log(`[O365-EMAIL] Inserting attachment record - TODO: implement DB insert`);
}
