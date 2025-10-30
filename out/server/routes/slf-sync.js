import express from "express";
const r = express.Router();
const canon = (e) => {
    if (!e)
        return "";
    const [u, d] = e.trim().toLowerCase().split("@");
    if (!d)
        return e.toLowerCase();
    if (d === "gmail.com" || d === "googlemail.com") {
        const b = u.split("+")[0].replace(/\./g, "");
        return `${b}@gmail.com`;
    }
    return `${u}@${d}`;
};
r.get("/contacts/build", async (req, res) => {
    const base = `${req.protocol}://${req.get("host")}`;
    const resp = await fetch(`${base}/api/slf/ext/credit/requests`);
    const { items = [] } = await resp.json();
    const buckets = new Map();
    for (const row of items) {
        // Map SLF API fields: sub=company, amount=amount, createdAt=createdAt
        const email = canon(row?.applicant_email || row?.email || `company-${row?.id}@slf.local`);
        if (!email)
            continue;
        const companyName = row?.sub || row?.business_name || row?.company || "Unknown Company";
        const b = buckets.get(email) || { email, name: row?.applicant_name || companyName, company: companyName, phone: row?.phone, applications: [] };
        b.name = row?.applicant_name || companyName;
        b.company = companyName;
        b.phone = row?.phone || b.phone;
        b.applications.push({
            externalId: row?.id,
            amount: row?.amount,
            status: row?.status || "active",
            createdAt: row?.createdAt || new Date().toISOString(),
            notes: row?.notes || ""
        });
        buckets.set(email, b);
    }
    res.json({ ok: true, items: [...buckets.values()] });
});
export default r;
