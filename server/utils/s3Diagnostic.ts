/**
 * 🧪 S3 DIAGNOSTIC UTILITY
 * 
 * Comprehensive S3 testing and validation for Staff Application
 * Tests bucket existence, permissions, and functionality
 * 
 * Created: July 25, 2025
 */

import { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ca-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface S3DiagnosticResult {
  success: boolean;
  test: string;
  region?: string;
  bucket?: string;
  error?: string;
  details?: any;
}

/**
 * Test basic S3 bucket configuration and access
 */
export async function testS3BucketAccess(bucket: string): Promise<S3DiagnosticResult> {
  try {
    console.log(`🧪 [S3 DIAGNOSTIC] Testing bucket access: ${bucket}`);
    
    const command = new HeadBucketCommand({ Bucket: bucket });
    await s3.send(command);
    
    return {
      success: true,
      test: "bucket-access",
      region: process.env.AWS_REGION || "ca-central-1",
      bucket,
      details: {
        message: "Bucket exists and is accessible",
        timestamp: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error(`❌ [S3 DIAGNOSTIC] Bucket access failed:`, error);
    
    return {
      success: false,
      test: "bucket-access",
      bucket,
      error: error instanceof Error ? error.message : String(error) || error.toString(),
      details: {
        code: error.Code || error.code,
        statusCode: error.$metadata?.httpStatusCode,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Test S3 upload functionality
 */
export async function testS3Upload(bucket: string): Promise<S3DiagnosticResult> {
  try {
    console.log(`🧪 [S3 DIAGNOSTIC] Testing upload functionality: ${bucket}`);
    
    const testKey = `diagnostic-test-${Date.now()}.txt`;
    const testContent = "S3 Upload Test - " + new Date().toISOString();
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testContent,
      ContentType: "text/plain",
      ServerSideEncryption: "AES256"
    });
    
    const result = await s3.send(command);
    
    return {
      success: true,
      test: "upload",
      bucket,
      details: {
        key: testKey,
        etag: result.ETag,
        serverSideEncryption: result.ServerSideEncryption,
        contentLength: testContent.length,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error(`❌ [S3 DIAGNOSTIC] Upload test failed:`, error);
    
    return {
      success: false,
      test: "upload",
      bucket,
      error: error instanceof Error ? error.message : String(error) || error.toString(),
      details: {
        code: error.Code || error.code,
        statusCode: error.$metadata?.httpStatusCode,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Test S3 pre-signed URL generation
 */
export async function testS3PreSignedUrl(bucket: string, key?: string): Promise<S3DiagnosticResult> {
  try {
    console.log(`🧪 [S3 DIAGNOSTIC] Testing pre-signed URL generation: ${bucket}`);
    
    const testKey = key || `diagnostic-test-${Date.now()}.txt`;
    const expiresIn = 3600; // 1 hour
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: testKey,
    });
    
    const preSignedUrl = await getSignedUrl(s3, command, { expiresIn });
    
    return {
      success: true,
      test: "presigned-url",
      bucket,
      details: {
        key: testKey,
        url: preSignedUrl,
        expiresIn: expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        timestamp: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error(`❌ [S3 DIAGNOSTIC] Pre-signed URL test failed:`, error);
    
    return {
      success: false,
      test: "presigned-url",
      bucket,
      error: error instanceof Error ? error.message : String(error) || error.toString(),
      details: {
        code: error.Code || error.code,
        statusCode: error.$metadata?.httpStatusCode,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Run comprehensive S3 diagnostic suite
 */
export async function runComprehensiveS3Diagnostic(bucket: string): Promise<{
  overall: boolean;
  results: S3DiagnosticResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    timestamp: string;
  };
}> {
  console.log(`🔍 [S3 DIAGNOSTIC] Starting comprehensive diagnostic for bucket: ${bucket}`);
  
  const results: S3DiagnosticResult[] = [];
  
  // Test 1: Bucket Access
  const bucketTest = await testS3BucketAccess(bucket);
  results.push(bucketTest);
  
  // Test 2: Upload (only if bucket access works)
  let uploadKey: string | undefined;
  if (bucketTest.success) {
    const uploadTest = await testS3Upload(bucket);
    results.push(uploadTest);
    if (uploadTest.success) {
      uploadKey = uploadTest.details?.key;
    }
  } else {
    results.push({
      success: false,
      test: "upload",
      bucket,
      error: "Skipped due to bucket access failure"
    });
  }
  
  // Test 3: Pre-signed URL (use uploaded file if available)
  const preSignedTest = await testS3PreSignedUrl(bucket, uploadKey);
  results.push(preSignedTest);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const overall = failed === 0;
  
  const summary = {
    total: results.length,
    passed,
    failed,
    timestamp: new Date().toISOString()
  };
  
  console.log(`📊 [S3 DIAGNOSTIC] Complete - ${passed}/${results.length} tests passed`);
  
  return {
    overall,
    results,
    summary
  };
}