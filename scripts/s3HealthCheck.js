#!/usr/bin/env node

/**
 * S3 Health Check and Bucket Verification
 * Verifies S3 configuration and bucket accessibility
 */

import {
  S3Client,
  HeadBucketCommand,
  ListObjectsV2Command,
  GetBucketEncryptionCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ca-central-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    : undefined
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'boreal-documents';

async function runS3HealthCheck() {
  console.log('\n🔍 [S3-HEALTH] Starting S3 health check...');
  console.log(`📦 [S3-HEALTH] Bucket: ${BUCKET_NAME}`);
  console.log(`🌍 [S3-HEALTH] Region: ${process.env.AWS_REGION || 'ca-central-1'}`);

  try {
    // Check if bucket exists and is accessible
    console.log('\n1. 📡 Testing bucket accessibility...');
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log('   ✅ Bucket accessible');

    // List objects to verify permissions
    console.log('\n2. 📋 Testing list permissions...');
    const listResult = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 5
    }));
    console.log(`   ✅ List permission verified (${listResult.Contents.length} objects found)`);

    // Test bucket encryption
    console.log('\n3. 🔐 Checking bucket encryption...');
    try {
      const encryptionResult = await s3.send(new GetBucketEncryptionCommand({ Bucket: BUCKET_NAME }));
      console.log('   ✅ Bucket encryption configured:');
      encryptionResult.ServerSideEncryptionConfiguration.Rules.forEach(rule => {
        rule.ApplyServerSideEncryptionByDefault && console.log(`      Algorithm: ${rule.ApplyServerSideEncryptionByDefault.SSEAlgorithm}`);
      });
    } catch (encError) {
      console.log('   ⚠️ Bucket encryption not configured or not accessible');
    }

    // Test upload permissions with a tiny test file
    console.log('\n4. 📤 Testing upload permissions...');
    const testKey = `health-check-${Date.now()}.txt`;
    const testContent = 'S3 health check test file';
    
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ServerSideEncryption: 'AES256'
    }));
    console.log(`   ✅ Upload permission verified (test file: ${testKey})`);

    // Clean up test file
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey
    }));
    console.log('   ✅ Test file cleaned up');

    // Test pre-signed URL generation
    console.log('\n5. 🔗 Testing pre-signed URL generation...');
    const presignedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: 'test-key'
      }),
      { expiresIn: 3600 }
    );
    console.log('   ✅ Pre-signed URL generation working');

    console.log('\n✅ [S3-HEALTH] All S3 health checks passed!');
    console.log('🚀 [S3-HEALTH] S3 pipeline ready for document uploads');

    return true;
  } catch (error) {
    console.error('\n❌ [S3-HEALTH] S3 health check failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    
    if (error.code === 'NoSuchBucket') {
      console.error('   💡 Solution: Create the bucket in AWS S3 console');
    } else if (error.code === 'AccessDenied') {
      console.error('   💡 Solution: Check AWS credentials and bucket permissions');
    }
    
    return false;
  }
}

// Run health check
runS3HealthCheck()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });