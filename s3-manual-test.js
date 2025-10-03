// Manual S3 test as requested
import { uploadToS3 } from './server/config/s3Config.js';

async function runS3Test() {
  console.log('🔍 Starting manual S3 test...');
  
  try {
    // Create a test buffer
    const testBuffer = Buffer.from('This is a test PDF file content for S3 upload verification');
    
    console.log('📋 Test parameters:');
    console.log('  - Buffer size:', testBuffer.length, 'bytes');
    console.log('  - File name: test.pdf');
    console.log('  - Content type: application/pdf');
    console.log('  - Application ID: d540f64a-c18a-4db3-b713-7a5cb808cfbb');
    
    const result = await uploadToS3({
      file: testBuffer,
      fileName: 'test.pdf',
      contentType: 'application/pdf',
      applicationId: 'd540f64a-c18a-4db3-b713-7a5cb808cfbb'
    });
    
    console.log('✅ S3 Upload successful!');
    console.log('📍 S3 Key:', result);
    console.log('🎯 Expected format: applicationId/fileName');
    
  } catch (error) {
    console.error('❌ S3 Upload failed:', error.message);
    console.error('📊 Error details:', error);
  }
}

runS3Test();