/**
 * 🚀 S3 ENVIRONMENT CONFIGURATION
 * 
 * Centralized S3 configuration management for Staff Application
 * Validates environment variables and provides defaults
 * 
 * Created: July 24, 2025
 */

// Validate required environment variables
function validateS3Environment() {
  const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️ [S3-ENV] Missing required environment variables: ${missing.join(', ')}`);
    console.warn(`⚠️ [S3-ENV] S3 integration will use fallback mode`);
    return false;
  }
  
  return true;
}

// S3 Environment Configuration
export const S3_ENVIRONMENT = {
  // Required credentials
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  
  // Bucket configuration
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'boreal-production-uploads',
  AWS_REGION: process.env.AWS_REGION || 'ca-central-1',
  
  // Security settings
  S3_SERVER_SIDE_ENCRYPTION: process.env.S3_SERVER_SIDE_ENCRYPTION || 'AES256',
  USE_S3_STORAGE: process.env.USE_S3_STORAGE !== 'false', // Default to true
  
  // Pre-signed URL settings
  PRESIGNED_URL_EXPIRY: parseInt(process.env.PRESIGNED_URL_EXPIRY || '3600'), // 1 hour
  
  // Validation
  isValid: validateS3Environment(),
  
  // Helper methods
  getBucketUrl: function() {
    return `https://${this.S3_BUCKET_NAME}.s3.${this.AWS_REGION}.amazonaws.com/`;
  },
  
  getConfigSummary: function() {
    return {
      bucket: this.S3_BUCKET_NAME,
      region: this.AWS_REGION,
      encryption: this.S3_SERVER_SIDE_ENCRYPTION,
      credentialsPresent: !!(this.AWS_ACCESS_KEY_ID && this.AWS_SECRET_ACCESS_KEY),
      enabled: this.USE_S3_STORAGE && this.isValid,
      bucketUrl: this.getBucketUrl()
    };
  }
};

// Log configuration status
console.log(`🔧 [S3-ENV] Environment configuration loaded:`);
console.log(`   Bucket: ${S3_ENVIRONMENT.S3_BUCKET_NAME}`);
console.log(`   Region: ${S3_ENVIRONMENT.AWS_REGION}`);
console.log(`   Encryption: ${S3_ENVIRONMENT.S3_SERVER_SIDE_ENCRYPTION}`);
console.log(`   Credentials: ${S3_ENVIRONMENT.isValid ? 'VALID' : 'MISSING'}`);
console.log(`   Enabled: ${S3_ENVIRONMENT.USE_S3_STORAGE && S3_ENVIRONMENT.isValid}`);

export default S3_ENVIRONMENT;