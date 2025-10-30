import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import { embedText } from "../services/embed.js";
const r = Router();
function chunk(md, max = 800) {
    const paras = md.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    const out = [];
    let buf = "";
    for (const p of paras) {
        if ((buf + "\n\n" + p).length > max) {
            if (buf)
                out.push(buf);
            buf = p;
        }
        else {
            buf = buf ? (buf + "\n\n" + p) : p;
        }
    }
    if (buf)
        out.push(buf);
    return out;
}
r.post("/training/docs", async (req, res) => {
    const { title, tags = [], content } = req.body || {};
    if (!title || !content)
        return res.status(400).json({ ok: false, error: "title_and_content_required" });
    const doc = (await db.execute(sql `insert into training_docs(title,tags,content) values(${title},${tags},${content}) returning id`)).rows[0];
    const chunks = chunk(content);
    let vecs = await embedText(chunks);
    for (let i = 0; i < chunks.length; i++) {
        await db.execute(sql `insert into training_doc_chunks(doc_id,idx,text,embedding) values(${doc.id},${i},${chunks[i]},${vecs ? JSON.stringify(vecs[i]) : null})`);
    }
    res.json({ ok: true, id: doc.id, chunks: chunks.length, embedded: !!vecs });
});
r.get("/training/docs", async (_req, res) => {
    const { rows } = await db.execute(sql `select id,title,tags,createdAt from training_docs order by createdAt desc limit 200`);
    res.json({ ok: true, items: rows });
});
// Hybrid search: semantic if embeddings exist; else PostgreSQL full-text; else simple includes.
r.get("/training/search", async (req, res) => {
    const q = (req.query.q || "").toString().trim();
    if (!q)
        return res.json({ ok: true, items: [] });
    // try semantic: embed query, cosine over JSON arrays (in JS), fallback to SQL full-text
    const qvec = await embedText([q]);
    if (qvec && qvec[0]) {
        const { rows } = await db.execute(sql `select id, doc_id, idx, text, embedding from training_doc_chunks`);
        function cosine(a, b) { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) {
            d += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        } return d / (Math.sqrt(na) * Math.sqrt(nb) || 1); }
        const scored = rows.filter(r => Array.isArray(r.embedding?.[0]) || Array.isArray(r.embedding))
            .map((r) => ({ ...r, score: cosine(qvec[0], r.embedding) }))
            .sort((a, b) => b.score - a.score).slice(0, 30);
        return res.json({ ok: true, items: scored.map((r) => ({ doc_id: r.doc_id, chunk_id: r.id, text: r.text, score: Number(r.score || 0) })) });
    }
    else {
        const { rows } = await db.execute(sql `
      select id, doc_id, idx, text, ts_rank_cd(to_tsvector('english', text), plainto_tsquery('english', ${q})) as score
      from training_doc_chunks
      where to_tsvector('english', text) @@ plainto_tsquery('english', ${q})
      order by score desc
      limit 30
    `).catch(() => ({ rows: [] }));
        if (rows.length)
            return res.json({ ok: true, items: rows });
        // super fallback
        const all = (await db.execute(sql `select id, doc_id, idx, text from training_doc_chunks`)).rows;
        const items = all.filter((r) => r.text.toLowerCase().includes(q.toLowerCase())).slice(0, 30).map(r => ({ ...r, score: 0.1 }));
        res.json({ ok: true, items });
    }
});
export default r;
