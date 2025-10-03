import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
// REMOVED: requirePermission from authz service (authentication system deleted)

const router = Router();

/* List OCR mappings */
router.get("/", async (req: any, res) => {
  const mappings = await db.execute(sql`
    SELECT m.*, u.email as created_by_email
    FROM ocr_mappings m
    LEFT JOIN users u ON u.id = m.created_by_user_id
    ORDER BY m.doc_type, m.name
  `);
  res.json(mappings.rows || []);
});

/* Create OCR mapping */
router.post("/", async (req: any, res) => {
  const { doc_type, name, description, rules } = req.body || {};
  
  const result = await db.execute(sql`
    INSERT INTO ocr_mappings (doc_type, name, description, rules, created_by_user_id)
    VALUES (${doc_type}, ${name}, ${description}, ${JSON.stringify(rules)}, ${req.user?.id})
    RETURNING *
  `);
  res.json(result.rows?.[0]);
});

/* Update OCR mapping */
router.put("/:id", async (req: any, res) => {
  const { id } = req.params;
  const { doc_type, name, description, rules } = req.body || {};
  
  const result = await db.execute(sql`
    UPDATE ocr_mappings 
    SET doc_type = ${doc_type}, name = ${name}, description = ${description}, 
        rules = ${JSON.stringify(rules)}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `);
  res.json(result.rows?.[0]);
});

/* Test OCR mapping against a document */
router.post("/:id/test/:documentId", async (req: any, res) => {
  const { id: mappingId, documentId } = req.params;
  
  // Get mapping and document
  const mapping = (await db.execute(sql`
    SELECT * FROM ocr_mappings WHERE id = ${mappingId}
  `)).rows?.[0];
  
  const document = (await db.execute(sql`
    SELECT d.*, o.extracted_text 
    FROM documents d
    LEFT JOIN document_ocr o ON o.document_id = d.id
    WHERE d.id = ${documentId}
  `)).rows?.[0];
  
  if (!mapping || !document) {
    return res.status(404).json({ error: "Mapping or document not found" });
  }
  
  if (!document.extracted_text) {
    return res.status(400).json({ error: "Document has no OCR text to test against" });
  }
  
  // Apply mapping rules
  const results = await applyMappingRules(mapping.rules, document.extracted_text);
  
  // Store test run
  await db.execute(sql`
    INSERT INTO ocr_mapping_runs (document_id, mapping_id, status, score, results)
    VALUES (${documentId}, ${mappingId}, 'tested', ${results.score}, ${JSON.stringify(results.fields)})
  `);
  
  res.json({ score: results.score, fields: results.fields });
});

/* Apply OCR mapping to update application data */
router.post("/:id/apply/:documentId", async (req: any, res) => {
  const { id: mappingId, documentId } = req.params;
  
  // Get mapping and document
  const mapping = (await db.execute(sql`
    SELECT * FROM ocr_mappings WHERE id = ${mappingId}
  `)).rows?.[0];
  
  const document = (await db.execute(sql`
    SELECT d.*, o.extracted_text 
    FROM documents d
    LEFT JOIN document_ocr o ON o.document_id = d.id
    WHERE d.id = ${documentId}
  `)).rows?.[0];
  
  if (!mapping || !document) {
    return res.status(404).json({ error: "Mapping or document not found" });
  }
  
  if (!document.extracted_text) {
    // Add to exceptions queue
    await db.execute(sql`
      INSERT INTO ocr_exceptions (document_id, reason)
      VALUES (${documentId}, 'No OCR text available')
    `);
    return res.status(400).json({ error: "Document has no OCR text" });
  }
  
  // Apply mapping rules
  const results = await applyMappingRules(mapping.rules, document.extracted_text);
  
  if (results.score < (process.env.OCR_MAPPING_MIN_SCORE || 0.55)) {
    // Add to exceptions queue for manual review
    await db.execute(sql`
      INSERT INTO ocr_exceptions (document_id, reason)
      VALUES (${documentId}, 'Mapping score too low: ' || ${results.score})
    `);
    return res.status(400).json({ error: "Mapping score too low", score: results.score });
  }
  
  // Update application with extracted data
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  
  for (const [field, data] of Object.entries(results.fields)) {
    if (data.value && data.score > 0.7) {
      updateFields.push(`${field} = $${updateValues.length + 1}`);
      updateValues.push(data.value);
    }
  }
  
  if (updateFields.length > 0) {
    updateValues.push(document.application_id);
    const query = `UPDATE applications SET ${updateFields.join(', ')} WHERE id = $${updateValues.length}`;
    await db.execute(sql.raw(query, updateValues));
  }
  
  // Store successful run
  await db.execute(sql`
    INSERT INTO ocr_mapping_runs (document_id, mapping_id, status, score, results)
    VALUES (${documentId}, ${mappingId}, 'applied', ${results.score}, ${JSON.stringify(results.fields)})
  `);
  
  res.json({ ok: true, score: results.score, fieldsUpdated: updateFields.length });
});

/* Get OCR exceptions queue */
router.get("/exceptions", async (req: any, res) => {
  const exceptions = await db.execute(sql`
    SELECT e.*, d.filename, d.category, a.business_name
    FROM ocr_exceptions e
    JOIN documents d ON d.id = e.document_id
    LEFT JOIN applications a ON a.id = d.application_id
    ORDER BY e.created_at DESC
    LIMIT 100
  `);
  res.json(exceptions.rows || []);
});

/* Mock OCR mapping rule application */
async function applyMappingRules(rules: any[], text: string) {
  const fields: any = {};
  let totalScore = 0;
  let matchCount = 0;
  
  for (const rule of rules) {
    const { field, strategy, pattern, flags, post, weight = 1 } = rule;
    let value = null;
    let score = 0;
    
    try {
      switch (strategy) {
        case 'regex':
          const regex = new RegExp(pattern, flags || 'i');
          const match = text.match(regex);
          if (match) {
            value = match[1] || match[0];
            score = 0.9;
          }
          break;
        case 'keyword':
          const keywordRegex = new RegExp(`${pattern}\\s*:?\\s*([^\\n]+)`, 'i');
          const keywordMatch = text.match(keywordRegex);
          if (keywordMatch) {
            value = keywordMatch[1].trim();
            score = 0.8;
          }
          break;
        case 'fuzzy':
          // Simple fuzzy match - in production would use a proper fuzzy string matching library
          const fuzzyRegex = new RegExp(pattern.split('').join('.*'), 'i');
          if (fuzzyRegex.test(text)) {
            const context = text.match(new RegExp(`.{0,20}${pattern}.{0,20}`, 'i'));
            if (context) {
              value = context[0].trim();
              score = 0.6;
            }
          }
          break;
      }
      
      // Apply post-processing
      if (value && post) {
        switch (post) {
          case 'digits':
            value = value.replace(/\D/g, '');
            break;
          case 'money':
            value = parseFloat(value.replace(/[^0-9.]/g, '')) || null;
            break;
          case 'upper':
            value = value.toUpperCase();
            break;
        }
      }
      
      if (value) {
        fields[field] = { value, score: score * weight, span: null };
        totalScore += score * weight;
        matchCount++;
      }
    } catch (error: unknown) {
      // Skip invalid rules
      continue;
    }
  }
  
  const averageScore = matchCount > 0 ? totalScore / matchCount : 0;
  
  return { score: averageScore, fields };
}

export default router;