// S3 Document Verification Script (ES Module)
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fetch from 'node-fetch';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || 'ca-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

export async function generatePresignedUrl(s3Key) {
  try {
    console.log(`🔗 Generating pre-signed URL for: ${s3Key}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log(`✅ Generated URL: ${url.substring(0, 80)}...`);
    
    return url;
  } catch (error) {
    console.error(`❌ Failed to generate URL for ${s3Key}:`, error.message);
    throw error;
  }
}

export async function testDocumentAccess(s3Key) {
  try {
    const url = await generatePresignedUrl(s3Key);
    
    // Test with HEAD request to check if file exists
    const response = await fetch(url, { method: 'HEAD' });
    
    const result = {
      s3Key,
      success: response.status === 200,
      status: response.status,
      contentLength: response.headers.get('content-length'),
      contentType: response.headers.get('content-type'),
      url: url.substring(0, 100) + '...'
    };
    
    if (result.success) {
      console.log(`✅ Document accessible: ${s3Key} (${result.contentLength} bytes)`);
    } else {
      console.log(`❌ Document not accessible: ${s3Key} (Status: ${result.status})`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Test failed for ${s3Key}:`, error.message);
    return {
      s3Key,
      success: false,
      error: error.message
    };
  }
}

export async function verifyS3Configuration() {
  console.log('🔧 S3 Configuration Check:');
  console.log(`Bucket: ${BUCKET_NAME || 'NOT SET'}`);
  console.log(`Region: ${process.env.AWS_DEFAULT_REGION || 'NOT SET'}`);
  console.log(`Access Key: ${process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Missing'}`);
  console.log(`Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Present' : 'Missing'}`);
  
  return {
    bucket: BUCKET_NAME,
    region: process.env.AWS_DEFAULT_REGION,
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
  };
}

// Test with sample document keys if script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = await verifyS3Configuration();
  console.log('\n📋 Configuration Result:', config);
  
  // Test with a sample S3 key structure
  const sampleKeys = [
    'documents/test-document.pdf',
    'uploads/sample-file.pdf'
  ];
  
  for (const key of sampleKeys) {
    console.log(`\n🧪 Testing key: ${key}`);
    const result = await testDocumentAccess(key);
    console.log('Result:', result);
  }
}