let openai = null;
try {
    const { OpenAI } = await import("openai");
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
}
catch { }
const SYS = "You are an assistant that writes concise, business-appropriate CRM content. Avoid fluff.";
async function gpt(prompt) {
    if (!openai)
        return null;
    try {
        const r = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages: [{ role: "system", content: SYS }, { role: "user", content: prompt }], temperature: 0.6 });
        return r.choices?.[0]?.message?.content?.trim() || null;
    }
    catch {
        return null;
    }
}
export async function draftReply(ctx) {
    const p = `Write a short reply (120-180 words) matching tone.\nContext:\n${JSON.stringify(ctx, null, 2)}`;
    return await gpt(p) || `Hi ${ctx?.toName || "there"},\n\nThanks for the note. Based on your ${ctx?.company || "company"} details, here's the next step I'd propose...\n\nBest,\n${ctx?.fromName || "Team"}`;
}
export async function wrapUp(obj) {
    const p = `Summarize the call with bullets: key points, objections, next steps (max 120 words). Transcript/notes:\n${obj?.transcript || obj?.notes || ""}`;
    return await gpt(p) || `• Key points: …\n• Objections: …\n• Next steps: …`;
}
export async function cueCards(obj) {
    const p = `Create 3 short bullets for a rep on a live call: who they are, last promise, one smart next question.\n${JSON.stringify(obj || {})}`;
    return await gpt(p) || `• Who: ${obj?.contact?.name || "Prospect"}, ${obj?.contact?.title || ""} @ ${obj?.contact?.company || ""}\n• Last promise: …\n• Ask: Could you share ${obj?.ruleHint || "last 3 months revenue trend"}?`;
}
export async function inmailDraft(obj) {
    const p = `Draft a LinkedIn connection note (<280 chars) using recipient's role & our value prop:\n${JSON.stringify(obj || {})}`;
    return await gpt(p) || `Hi ${obj?.toName || "there"} — loved your work at ${obj?.company || "your team"}. We help ${obj?.segment || "SMBs"} improve cash flow with flexible financing. Open to a 10-min chat next week?`;
}
export function docKit(contact) {
    const industry = (contact?.industry || "general").toLowerCase();
    const base = ["Government ID", "Voided cheque", "Last 3 months bank statements"];
    const addons = industry.includes("construction") ? ["A/R aging", "WIP schedule"] :
        industry.includes("retail") ? ["Last 2 months merchant statements"] :
            ["Most recent tax return"];
    return [...base, ...addons];
}
