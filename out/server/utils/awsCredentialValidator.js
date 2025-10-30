import { S3Client, ListBucketsCommand, HeadBucketCommand, CreateBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
export async function validateAWSCredentials() {
    const result = {
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
        const credentials = { accessKeyId, secretAccessKey };
        const s3 = new S3Client({ region, credentials });
        // Test 1: List buckets permission (also validates credentials)
        try {
            await s3.send(new ListBucketsCommand({}));
            result.permissions.s3ListBuckets = true;
            console.log(`✅ [CREDENTIAL CHECK] S3 ListBuckets permission verified`);
        }
        catch (error) {
            console.log(`❌ [CREDENTIAL CHECK] S3 ListBuckets failed: ${error.code}`);
            result.error = `S3 ListBuckets failed: ${error.code}`;
            result.guidance = 'Credentials are invalid or lack S3 ListBuckets permission';
            return result;
        }
        // Test 2: Check if boreal-documents bucket exists
        try {
            await s3.send(new HeadBucketCommand({ Bucket: 'boreal-documents' }));
            console.log(`✅ [CREDENTIAL CHECK] boreal-documents bucket exists`);
        }
        catch (error) {
            console.log(`⚠️ [CREDENTIAL CHECK] boreal-documents bucket does not exist: ${error.code}`);
            // Test 3: Create bucket permission (if bucket doesn't exist)
            try {
                await s3.send(new CreateBucketCommand({
                    Bucket: 'boreal-documents',
                    CreateBucketConfiguration: region === 'us-east-1' ? undefined : { LocationConstraint: region }
                }));
                result.permissions.s3CreateBucket = true;
                console.log(`✅ [CREDENTIAL CHECK] Created boreal-documents bucket successfully`);
            }
            catch (createError) {
                console.log(`❌ [CREDENTIAL CHECK] Create bucket failed: ${createError.code}`);
            }
        }
        // Test 4: Put object permission (test with small object)
        try {
            await s3.send(new PutObjectCommand({
                Bucket: 'boreal-documents',
                Key: 'test-permission.txt',
                Body: 'Permission test',
                ContentType: 'text/plain'
            }));
            result.permissions.s3PutObject = true;
            console.log(`✅ [CREDENTIAL CHECK] S3 PutObject permission verified`);
        }
        catch (error) {
            console.log(`❌ [CREDENTIAL CHECK] S3 PutObject failed: ${error.code}`);
        }
        // Test 5: Get object permission
        try {
            await s3.send(new GetObjectCommand({
                Bucket: 'boreal-documents',
                Key: 'test-permission.txt'
            }));
            result.permissions.s3GetObject = true;
            console.log(`✅ [CREDENTIAL CHECK] S3 GetObject permission verified`);
        }
        catch (error) {
            console.log(`❌ [CREDENTIAL CHECK] S3 GetObject failed: ${error.code}`);
        }
        // Clean up test file
        try {
            await s3.send(new DeleteObjectCommand({
                Bucket: 'boreal-documents',
                Key: 'test-permission.txt'
            }));
            console.log(`🧹 [CREDENTIAL CHECK] Cleaned up test file`);
        }
        catch (error) {
            console.log(`⚠️ [CREDENTIAL CHECK] Could not clean up test file: ${error.code}`);
        }
        // Determine overall success
        const requiredPermissions = result.permissions.s3ListBuckets &&
            result.permissions.s3PutObject &&
            result.permissions.s3GetObject;
        if (requiredPermissions) {
            result.success = true;
            result.guidance = 'All required AWS S3 permissions verified successfully';
        }
        else {
            result.error = 'Missing required S3 permissions';
            result.guidance = 'IAM user needs S3 permissions: ListBucket, GetObject, PutObject, CreateBucket';
        }
        return result;
    }
    catch (error) {
        result.error = `Credential validation failed: ${error instanceof Error ? error.message : String(error)}`;
        result.guidance = 'Please verify your AWS credentials and try again';
        return result;
    }
}
