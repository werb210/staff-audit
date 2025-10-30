import crypto from "crypto";
export function verifyTwilioSignature(opts) {
    // Per Twilio: signature = Base64(HMAC-SHA1(authToken, fullUrl + sortedBodyParams))
    const url = opts.fullUrl;
    let data = url;
    if (opts.body && typeof opts.body === "object") {
        const keys = Object.keys(opts.body).sort();
        for (const k of keys) {
            data += k + opts.body[k];
        }
    }
    const hmac = crypto.createHmac("sha1", opts.authToken).update(data).digest("base64");
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(opts.headerSig || "", "utf8"));
}
