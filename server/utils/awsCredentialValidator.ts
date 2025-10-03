import AWS from 'aws-sdk';

export interface CredentialValidation {
  success: boolean;
  accessKeyValid: boolean;
  secretKeyValid: boolean;
  permissions: {
    s3ListBuckets: boolean;
    s3CreateBucket: boolean;
    s3GetObject: boolean;
    s3PutObject: boolean;
  };
  error?: string;
  guidance: string;
}

export async function validateAWSCredentials(): Promise<CredentialValidation> {
  const result: CredentialValidation = {
    success: false,
    accessKeyValid: false,
    secretKeyValid: false,
    permissions: {
      s3ListBuckets: false,
      s3CreateBucket: false,
      s3GetObject: false,
      s3PutObject: false
    },
    guidance: ''
  };

  try {
    // Check if credentials are set
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_DEFAULT_REGION || 'ca-central-1';

    console.log(`🔐 [CREDENTIAL CHECK] Access Key ID: ${accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'MISSING'}`);
    console.log(`🔐 [CREDENTIAL CHECK] Secret Key: ${secretAccessKey ? 'SET' : 'MISSING'}`);
    console.log(`🔐 [CREDENTIAL CHECK] Region: ${region}`);

    if (!accessKeyId || !secretAccessKey) {
      result.error = 'Missing AWS credentials';
      result.guidance = 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in environment variables';
      return result;
    }

    // Validate Access Key format
    if (!accessKeyId.match(/^AKIA[0-9A-Z]{16}$/)) {
      result.error = 'Invalid Access Key ID format';
      result.guidance = 'AWS Access Key ID must be 20 characters starting with AKIA followed by 16 alphanumeric characters';
      return result;
    }
    result.accessKeyValid = true;

    // Validate Secret Key format
    if (secretAccessKey.length !== 40) {
      result.error = 'Invalid Secret Access Key format';
      result.guidance = 'AWS Secret Access Key must be exactly 40 characters';
      return result;
    }
    result.secretKeyValid = true;

    // Configure AWS SDK
    AWS.config.update({
      accessKeyId,
      secretAccessKey,
      region
    });

    const s3 = new AWS.S3();
    const sts = new AWS.STS();

    // Test 1: Verify credentials work with STS
    try {
      await sts.getCallerIdentity().promise();
      console.log(`✅ [CREDENTIAL CHECK] STS identity verification passed`);
    } catch (error: any) {
      result.error = `STS verification failed: ${error.code}`;
      result.guidance = 'Credentials are invalid or expired. Please check your AWS Access Key ID and Secret Access Key';
      return result;
    }

    // Test 2: List buckets permission
    try {
      await s3.listBuckets().promise();
      result.permissions.s3ListBuckets = true;
      console.log(`✅ [CREDENTIAL CHECK] S3 ListBuckets permission verified`);
    } catch (error: any) {
      console.log(`❌ [CREDENTIAL CHECK] S3 ListBuckets failed: ${error.code}`);
    }

    // Test 3: Check if boreal-documents bucket exists
    try {
      await s3.headBucket({ Bucket: 'boreal-documents' }).promise();
      console.log(`✅ [CREDENTIAL CHECK] boreal-documents bucket exists`);
    } catch (error: any) {
      console.log(`⚠️ [CREDENTIAL CHECK] boreal-documents bucket does not exist: ${error.code}`);
      
      // Test 4: Create bucket permission (if bucket doesn't exist)
      try {
        await s3.createBucket({
          Bucket: 'boreal-documents',
          CreateBucketConfiguration: {
            LocationConstraint: region === 'us-east-1' ? undefined : region
          }
        }).promise();
        result.permissions.s3CreateBucket = true;
        console.log(`✅ [CREDENTIAL CHECK] Created boreal-documents bucket successfully`);
      } catch (createError: any) {
        console.log(`❌ [CREDENTIAL CHECK] Create bucket failed: ${createError.code}`);
      }
    }

    // Test 5: Put object permission (test with small object)
    try {
      await s3.putObject({
        Bucket: 'boreal-documents',
        Key: 'test-permission.txt',
        Body: 'Permission test',
        ContentType: 'text/plain'
      }).promise();
      result.permissions.s3PutObject = true;
      console.log(`✅ [CREDENTIAL CHECK] S3 PutObject permission verified`);
    } catch (error: any) {
      console.log(`❌ [CREDENTIAL CHECK] S3 PutObject failed: ${error.code}`);
    }

    // Test 6: Get object permission
    try {
      await s3.getObject({
        Bucket: 'boreal-documents',
        Key: 'test-permission.txt'
      }).promise();
      result.permissions.s3GetObject = true;
      console.log(`✅ [CREDENTIAL CHECK] S3 GetObject permission verified`);
    } catch (error: any) {
      console.log(`❌ [CREDENTIAL CHECK] S3 GetObject failed: ${error.code}`);
    }

    // Clean up test file
    try {
      await s3.deleteObject({
        Bucket: 'boreal-documents',
        Key: 'test-permission.txt'
      }).promise();
      console.log(`🧹 [CREDENTIAL CHECK] Cleaned up test file`);
    } catch (error: any) {
      console.log(`⚠️ [CREDENTIAL CHECK] Could not clean up test file: ${error.code}`);
    }

    // Determine overall success
    const requiredPermissions = result.permissions.s3ListBuckets && 
                              result.permissions.s3PutObject && 
                              result.permissions.s3GetObject;

    if (requiredPermissions) {
      result.success = true;
      result.guidance = 'All required AWS S3 permissions verified successfully';
    } else {
      result.error = 'Missing required S3 permissions';
      result.guidance = 'IAM user needs S3 permissions: ListBucket, GetObject, PutObject, CreateBucket';
    }

    return result;

  } catch (error: any) {
    result.error = `Credential validation failed: ${error instanceof Error ? error.message : String(error)}`;
    result.guidance = 'Please verify your AWS credentials and try again';
    return result;
  }
}