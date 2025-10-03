const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testDocuments() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        document_type,
        file_name, 
        file_size,
        created_at,
        is_verified,
        storage_key,
        checksum
      FROM documents 
      WHERE application_id = $1
      ORDER BY created_at DESC
    `, ['b853fd85-0161-4172-8143-236a9a573e0c']);
    
    const documents = result.rows.map(doc => ({
      documentId: doc.id,
      documentType: doc.document_type,
      fileName: doc.file_name,
      storageKey: doc.storage_key || `b853fd85-0161-4172-8143-236a9a573e0c/${doc.file_name}`,
      uploadedAt: doc.created_at,
      fileSize: doc.file_size,
      status: doc.is_verified ? 'verified' : 'uploaded',
      checksum: doc.checksum
    }));
    
    console.log(JSON.stringify({
      documents,
      count: documents.length,
      applicationId: 'b853fd85-0161-4172-8143-236a9a573e0c'
    }, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testDocuments();
