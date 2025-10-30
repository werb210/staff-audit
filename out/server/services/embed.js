export async function embedText(texts) {
    const key = process.env.OPENAI_API_KEY;
    if (!key)
        return null; // fallback to keyword search
    try {
        const rsp = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({ model: "text-embedding-3-large", input: texts })
        });
        const j = await rsp.json();
        if (!rsp.ok)
            throw new Error(j?.error?.message || "embedding_failed");
        return j.data.map((d) => d.embedding);
    }
    catch {
        return null;
    }
}
