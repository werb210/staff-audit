// Manual S3 test to identify issues
import { uploadToS3, testS3Connection } from './server/config/s3Config.js';

async function testS3Upload() {
  try {
    console.log('🔍 Testing S3 connection...');
    const connected = await testS3Connection();
    console.log('Connection result:', connected);
    
    if (connected) {
      console.log('🔍 Testing S3 upload...');
      const testBuffer = Buffer.from('test file content');
      const result = await uploadToS3({
        file: testBuffer,
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        applicationId: 'd540f64a-c18a-4db3-b713-7a5cb808cfbb'
      });
      console.log('Upload result:', result);
    }
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error details:', error.stack);
  }
}

testS3Upload();