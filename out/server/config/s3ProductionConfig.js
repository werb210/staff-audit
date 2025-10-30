/**
 * 🚀 S3 PRODUCTION CONFIGURATION
 *
 * Enables full S3 integration for staff application
 * Created: July 24, 2025
 */
// Production S3 Configuration - CRITICAL FIX July 26, 2025
export const S3_PRODUCTION_CONFIG = {
    enabled: true,
    bucket: process.env.CORRECT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'boreal-documents',
    region: process.env.AWS_REGION || 'ca-central-1',
    useS3Storage: process.env.USE_S3_STORAGE === 'true' || true,
    // Storage key generation
    generateStorageKey: (applicationId, fileName) => {
        return `${applicationId}/${fileName}`;
    },
    // Pre-signed URL expiration (1 hour)
    preSignedUrlExpiration: 3600,
    // File validation
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/tiff'
    ]
};
console.log('🚀 [S3 PRODUCTION] Configuration loaded:', {
    enabled: S3_PRODUCTION_CONFIG.enabled,
    bucket: S3_PRODUCTION_CONFIG.bucket,
    region: S3_PRODUCTION_CONFIG.region,
    useS3Storage: S3_PRODUCTION_CONFIG.useS3Storage
});
