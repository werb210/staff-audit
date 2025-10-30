export async function postSlack(text, extra = {}) {
    const url = process.env.ALERTS_WEBHOOK_URL;
    if (!url)
        return;
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, ...extra })
        });
    }
    catch { }
}
