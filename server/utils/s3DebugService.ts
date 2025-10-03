/**
 * 🔍 COMPREHENSIVE S3 DEBUG SERVICE
 * 
 * Deep diagnostic logging for S3 configuration and access issues
 * Provides detailed error analysis for document preview/download failures
 */

import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface S3DebugResult {
  success: boolean;
  bucketName: string;
  region: string;
  credentialsPresent: boolean;
  bucketAccessible: boolean;
  objectExists?: boolean;
  preSignedUrl?: string;
  directS3Url?: string;
  error?: any;
  awsErrorCode?: string;
  awsErrorMessage?: string;
  troubleshooting: string[];
}

/**
 * Comprehensive S3 Debug Analysis
 */
export class S3DebugService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    // Extract configuration from environment
    this.bucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'boreal-documents';
    this.region = 'ca-central-1'; // Fixed region to match bucket location
    
    console.log(`🔍 [S3-DEBUG] Initializing S3 Debug Service`);
    console.log(`🔍 [S3-DEBUG] Bucket Name: ${this.bucketName}`);
    console.log(`🔍 [S3-DEBUG] Region: ${this.region}`);
    console.log(`🔍 [S3-DEBUG] Access Key: ${process.env.AWS_ACCESS_KEY_ID ? 'Present' : 'Missing'}`);
    console.log(`🔍 [S3-DEBUG] Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Present' : 'Missing'}`);
    
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  /**
   * Test bucket accessibility
   */
  async testBucketAccess(): Promise<{ accessible: boolean; error?: any }> {
    try {
      console.log(`🔍 [S3-DEBUG] Testing bucket access for: ${this.bucketName}`);
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1
      });
      
      const result = await this.s3Client.send(command);
      console.log(`✅ [S3-DEBUG] Bucket access successful. Contains ${result.KeyCount} objects`);
      
      return { accessible: true };
    } catch (error: any) {
      console.error(`❌ [S3-DEBUG] Bucket access failed:`, error instanceof Error ? error.message : String(error));
      console.error(`❌ [S3-DEBUG] AWS Error Code: ${error.name}`);
      console.error(`❌ [S3-DEBUG] AWS Error Details:`, error);
      
      return { accessible: false, error };
    }
  }

  /**
   * Test if specific object exists
   */
  async testObjectExists(objectKey: string): Promise<{ exists: boolean; error?: any; metadata?: any }> {
    try {
      console.log(`🔍 [S3-DEBUG] Checking if object exists: ${objectKey}`);
      
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey
      });
      
      const result = await this.s3Client.send(command);
      console.log(`✅ [S3-DEBUG] Object exists. Size: ${result.ContentLength} bytes`);
      console.log(`✅ [S3-DEBUG] Content Type: ${result.ContentType}`);
      console.log(`✅ [S3-DEBUG] Last Modified: ${result.LastModified}`);
      
      return { 
        exists: true, 
        metadata: {
          size: result.ContentLength,
          contentType: result.ContentType,
          lastModified: result.LastModified,
          etag: result.ETag
        }
      };
    } catch (error: any) {
      console.error(`❌ [S3-DEBUG] Object check failed for ${objectKey}:`, error instanceof Error ? error.message : String(error));
      console.error(`❌ [S3-DEBUG] AWS Error Code: ${error.name}`);
      
      return { exists: false, error };
    }
  }

  /**
   * Generate and test pre-signed URL
   */
  async testPreSignedUrl(objectKey: string): Promise<{ url?: string; error?: any; curlTest?: string }> {
    try {
      console.log(`🔍 [S3-DEBUG] Generating pre-signed URL for: ${objectKey}`);
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey
      });
      
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      console.log(`✅ [S3-DEBUG] Pre-signed URL generated successfully`);
      console.log(`✅ [S3-DEBUG] URL length: ${url.length} characters`);
      
      // Generate curl test command
      const curlTest = `curl -I "${url}"`;
      
      return { url, curlTest };
    } catch (error: any) {
      console.error(`❌ [S3-DEBUG] Pre-signed URL generation failed:`, error instanceof Error ? error.message : String(error));
      console.error(`❌ [S3-DEBUG] AWS Error Code: ${error.name}`);
      
      return { error };
    }
  }

  /**
   * Test upload functionality
   */
  async testUpload(): Promise<{ success: boolean; objectKey?: string; error?: any }> {
    const testKey = `debug-test/${Date.now()}-test.txt`;
    const testContent = Buffer.from('S3 Debug Test File - ' + new Date().toISOString());
    
    try {
      console.log(`🔍 [S3-DEBUG] Testing upload functionality with key: ${testKey}`);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain',
        ServerSideEncryption: 'AES256'
      });
      
      await this.s3Client.send(command);
      console.log(`✅ [S3-DEBUG] Test upload successful`);
      
      return { success: true, objectKey: testKey };
    } catch (error: any) {
      console.error(`❌ [S3-DEBUG] Test upload failed:`, error instanceof Error ? error.message : String(error));
      console.error(`❌ [S3-DEBUG] AWS Error Code: ${error.name}`);
      
      return { success: false, error };
    }
  }

  /**
   * Comprehensive S3 diagnostic
   */
  async runComprehensiveDiagnostic(objectKey?: string): Promise<S3DebugResult> {
    console.log(`🔍 [S3-DEBUG] Running comprehensive S3 diagnostic...`);
    
    const result: S3DebugResult = {
      success: false,
      bucketName: this.bucketName,
      region: this.region,
      credentialsPresent: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      bucketAccessible: false,
      troubleshooting: []
    };

    // Generate direct S3 URL for comparison
    if (objectKey) {
      result.directS3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${objectKey}`;
    }

    // Test 1: Bucket Access
    const bucketTest = await this.testBucketAccess();
    result.bucketAccessible = bucketTest.accessible;
    
    if (!bucketTest.accessible) {
      result.error = bucketTest.error;
      result.awsErrorCode = bucketTest.error?.name;
      result.awsErrorMessage = bucketTest.error?.message;
      
      result.troubleshooting.push('Bucket is not accessible');
      
      if (bucketTest.error?.name === 'NoSuchBucket') {
        result.troubleshooting.push(`Bucket "${this.bucketName}" does not exist`);
        result.troubleshooting.push('Check S3_BUCKET_NAME environment variable');
      } else if (bucketTest.error?.name === 'InvalidAccessKeyId') {
        result.troubleshooting.push('Invalid AWS Access Key ID');
        result.troubleshooting.push('Check AWS_ACCESS_KEY_ID environment variable');
      } else if (bucketTest.error?.name === 'SignatureDoesNotMatch') {
        result.troubleshooting.push('Invalid AWS Secret Access Key');
        result.troubleshooting.push('Check AWS_SECRET_ACCESS_KEY environment variable');
      } else if (bucketTest.error?.name === 'AccessDenied') {
        result.troubleshooting.push('Access denied to bucket');
        result.troubleshooting.push('Check IAM permissions for the user');
      } else {
        result.troubleshooting.push(`AWS Error: ${bucketTest.error?.name}`);
        result.troubleshooting.push(`Message: ${bucketTest.error?.message}`);
      }
      
      return result;
    }

    // Test 2: Object Existence (if objectKey provided)
    if (objectKey) {
      const objectTest = await this.testObjectExists(objectKey);
      result.objectExists = objectTest.exists;
      
      if (!objectTest.exists) {
        result.troubleshooting.push(`Object "${objectKey}" does not exist in bucket`);
        result.troubleshooting.push('Check storage_key field in database');
        result.troubleshooting.push('Verify document was uploaded to S3 correctly');
      }
    }

    // Test 3: Pre-signed URL generation (if objectKey provided)
    if (objectKey) {
      const urlTest = await this.testPreSignedUrl(objectKey);
      result.preSignedUrl = urlTest.url;
      
      if (urlTest.error) {
        result.troubleshooting.push('Pre-signed URL generation failed');
        result.troubleshooting.push(`AWS Error: ${urlTest.error?.name}`);
      } else if (urlTest.url) {
        result.troubleshooting.push('Pre-signed URL generated successfully');
        result.troubleshooting.push(`Test with: ${urlTest.curlTest}`);
      }
    }

    // Test 4: Upload functionality
    const uploadTest = await this.testUpload();
    if (uploadTest.success) {
      result.troubleshooting.push('Upload functionality working correctly');
      
      // Clean up test file
      if (uploadTest.objectKey) {
        try {
          await this.s3Client.send(new (await import('@aws-sdk/client-s3')).DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: uploadTest.objectKey
          }));
          console.log(`🧹 [S3-DEBUG] Cleaned up test file: ${uploadTest.objectKey}`);
        } catch (error: unknown) {
          console.warn(`⚠️ [S3-DEBUG] Could not clean up test file: ${uploadTest.objectKey}`);
        }
      }
    } else {
      result.troubleshooting.push('Upload functionality failed');
      result.troubleshooting.push(`AWS Error: ${uploadTest.error?.name}`);
    }

    // Determine overall success
    result.success = result.bucketAccessible && (!objectKey || result.objectExists === true);
    
    if (result.success) {
      result.troubleshooting.push('✅ All S3 operations working correctly');
    }

    return result;
  }
}

// Export singleton instance
export const s3DebugService = new S3DebugService();