// S3 Pre-signed URL Test Script
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Test S3 configuration
const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || 'ca-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

async function testS3PresignedUrl(s3Key) {
  try {
    console.log(`🔗 Testing S3 pre-signed URL for key: ${s3Key}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log(`✅ Pre-signed URL generated: ${url.substring(0, 100)}...`);
    
    // Test the URL with a fetch request
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { method: 'HEAD' });
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Content-Length: ${response.headers.get('content-length')}`);
    console.log(`📊 Content-Type: ${response.headers.get('content-type')}`);
    
    return {
      success: response.status === 200,
      status: response.status,
      contentLength: response.headers.get('content-length'),
      contentType: response.headers.get('content-type'),
      url: url
    };
    
  } catch (error) {
    console.error(`❌ S3 test failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testS3Configuration() {
  console.log('🔧 S3 Configuration Test');
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Region: ${process.env.AWS_DEFAULT_REGION}`);
  console.log(`Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Missing'}`);
  console.log(`Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Present' : 'Missing'}`);
  
  // Test with a sample S3 key (if any exist)
  const testKey = 'documents/test-document.pdf';
  const result = await testS3PresignedUrl(testKey);
  
  return result;
}

// Export for use in other modules
module.exports = { testS3PresignedUrl, testS3Configuration };

// Run test if called directly
if (require.main === module) {
  testS3Configuration().then(result => {
    console.log('\n🎯 Final Test Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}