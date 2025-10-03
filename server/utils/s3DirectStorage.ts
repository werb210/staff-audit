import AWS from 'aws-sdk';
import crypto from 'crypto';

// Configure S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ca-central-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'boreal-documents';

interface S3UploadResult {
  success: boolean;
  storageKey?: string;
  checksum?: string;
  error?: string;
}

/**
 * Direct S3 upload with strict success/failure handling
 * NO FALLBACK LOGIC - either succeeds or fails cleanly
 */
export async function uploadToS3(
  buffer: Buffer,
  fileName: string,
  applicationId: string
): Promise<S3UploadResult> {
  
  console.log(`☁️ [S3-DIRECT] Starting upload: ${fileName} (${buffer.length} bytes)`);
  
  try {
    // Generate storage key and checksum
    const storageKey = `${applicationId}/${fileName}`;
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    
    console.log(`🔑 [S3-DIRECT] Storage key: ${storageKey}`);
    console.log(`🔐 [S3-DIRECT] SHA256: ${checksum}`);

    // Upload to S3 with server-side encryption
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: storageKey,
      Body: buffer,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'original-filename': fileName,
        'application-id': applicationId,
        'upload-timestamp': new Date().toISOString(),
        'checksum': checksum
      }
    };

    console.log(`📤 [S3-DIRECT] Uploading to bucket: ${BUCKET_NAME}`);
    
    const result = await s3.upload(uploadParams).promise();
    
    console.log(`✅ [S3-DIRECT] Upload successful: ${result.Location}`);
    console.log(`🏷️ [S3-DIRECT] ETag: ${result.ETag}`);

    return {
      success: true,
      storageKey: storageKey,
      checksum: checksum
    };

  } catch (error: any) {
    console.error(`❌ [S3-DIRECT] Upload failed for ${fileName}:`, error instanceof Error ? error.message : String(error));
    console.error(`❌ [S3-DIRECT] Error code: ${error.code}`);
    console.error(`❌ [S3-DIRECT] Status code: ${error.statusCode}`);

    return {
      success: false,
      error: `S3 upload failed: ${error instanceof Error ? error.message : String(error)} (Code: ${error.code})`
    };
  }
}

/**
 * Test S3 connection and permissions
 */
export async function testS3Connection(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔍 [S3-TEST] Testing connection to bucket: ${BUCKET_NAME}`);
    
    // Test bucket access
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
    console.log(`✅ [S3-TEST] Bucket accessible`);

    // Test upload permissions with small test file
    const testKey = `connection-test-${Date.now()}.txt`;
    const testContent = Buffer.from('S3 connection test', 'utf8');
    
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ServerSideEncryption: 'AES256'
    }).promise();

    console.log(`✅ [S3-TEST] Upload permission verified`);

    // Clean up test file
    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: testKey
    }).promise();

    console.log(`✅ [S3-TEST] Cleanup successful - S3 connection verified`);

    return { success: true };
    
  } catch (error: any) {
    console.error(`❌ [S3-TEST] Connection test failed:`, error instanceof Error ? error.message : String(error));
    
    return {
      success: false,
      error: `S3 connection failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Generate pre-signed URL for document access
 */
export async function getPreSignedUrl(storageKey: string, expiresIn: number = 3600): Promise<string> {
  const params = {
    Bucket: BUCKET_NAME,
    Key: storageKey,
    Expires: expiresIn
  };

  return s3.getSignedUrl('getObject', params);
}

/**
 * Stream document from S3 for download
 */
export async function streamDocumentFromS3(storageKey: string): Promise<AWS.S3.GetObjectOutput> {
  const params = {
    Bucket: BUCKET_NAME,
    Key: storageKey
  };

  return s3.getObject(params).promise();
}

export { BUCKET_NAME };