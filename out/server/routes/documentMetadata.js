// Feature 4: Document Tags and Metadata Management
import { Router } from "express";
import { db } from "../db.js";
import { documents } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
const router = Router();
// Update document tags
router.patch("/:id/tags", async (req, res) => {
    try {
        const documentId = req.params.id;
        const { tags } = req.body;
        if (!Array.isArray(tags)) {
            return res.status(400).json({ error: "Tags must be an array" });
        }
        await db
            .update(documents)
            .set({
            tags,
            updatedAt: new Date()
        })
            .where(eq(documents.id, documentId));
        console.log(`🏷️ [METADATA] Updated tags for document ${documentId}: ${tags.join(', ')}`);
        res.json({ success: true, tags });
    }
    catch (error) {
        console.error("Error updating document tags:", error);
        res.status(500).json({ error: "Failed to update tags" });
    }
});
// Update document description
router.patch("/:id/description", async (req, res) => {
    try {
        const documentId = req.params.id;
        const { description } = req.body;
        await db
            .update(documents)
            .set({
            description,
            updatedAt: new Date()
        })
            .where(eq(documents.id, documentId));
        console.log(`📝 [METADATA] Updated description for document ${documentId}`);
        res.json({ success: true, description });
    }
    catch (error) {
        console.error("Error updating document description:", error);
        res.status(500).json({ error: "Failed to update description" });
    }
});
// Get all unique tags across documents
router.get("/tags", async (req, res) => {
    try {
        const docsWithTags = await db
            .select({ tags: documents.tags })
            .from(documents)
            .where(eq(documents.tags, documents.tags)); // Filter out null tags
        const allTags = new Set();
        docsWithTags.forEach(doc => {
            if (doc.tags) {
                doc.tags.forEach(tag => allTags.add(tag));
            }
        });
        res.json({ tags: Array.from(allTags).sort() });
    }
    catch (error) {
        console.error("Error fetching tags:", error);
        res.status(500).json({ error: "Failed to fetch tags" });
    }
});
// Search documents by tags
router.get("/search", async (req, res) => {
    try {
        const { tags, description } = req.query;
        let docs = await db
            .select()
            .from(documents);
        // Filter by tags if provided
        if (tags) {
            const searchTags = Array.isArray(tags) ? tags : [tags];
            docs = docs.filter(doc => doc.tags && searchTags.some(tag => doc.tags?.includes(tag)));
        }
        // Filter by description if provided
        if (description) {
            docs = docs.filter(doc => doc.description && doc.description.toLowerCase().includes(description.toLowerCase()));
        }
        res.json({ documents: docs, count: docs.length });
    }
    catch (error) {
        console.error("Error searching documents:", error);
        res.status(500).json({ error: "Failed to search documents" });
    }
});
export default router;
