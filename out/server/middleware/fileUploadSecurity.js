/**
 * File Upload Security Middleware
 * Provides comprehensive security for file uploads including validation, sanitization, and protection
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sanitizeFilename, securitySchemas } from '../utils/security';
// Allowed file types with their MIME types
const ALLOWED_FILE_TYPES = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/csv': ['.csv'],
    'text/plain': ['.txt']
};
// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Maximum number of files per upload
const MAX_FILES = 10;
/**
 * File filter function to validate file types
 */
const fileFilter = (req, file, cb) => {
    // ✅ CRITICAL FIX: Accept PDF MIME variations for security middleware
    const allowedPdfMimes = ['application/pdf', 'application/x-pdf', 'application/octet-stream', 'binary/octet-stream'];
    const isPdfVariation = file.originalname.toLowerCase().endsWith('.pdf') && allowedPdfMimes.includes(file.mimetype);
    console.log(`🔍 [SECURITY MIME DEBUG] File: ${file.originalname}, MIME: ${file.mimetype}, Size: ${file.size}`);
    // Check MIME type with PDF variations support
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.mimetype) && !isPdfVariation) {
        console.log(`❌ [SECURITY REJECT] File type ${file.mimetype} not allowed`);
        return cb(new Error(`File type ${file.mimetype} not allowed`));
    }
    else {
        console.log(`✅ [SECURITY ACCEPT] File type ${file.mimetype} allowed`);
    }
    // Check file extension
    const fileExt = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ALLOWED_FILE_TYPES[file.mimetype];
    if (!allowedExtensions.includes(fileExt)) {
        return cb(new Error(`File extension ${fileExt} not allowed for MIME type ${file.mimetype}`));
    }
    // Additional security checks
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
        return cb(new Error('Invalid filename - path traversal detected'));
    }
    cb(null, true);
};
/**
 * Storage configuration with security measures
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create application-specific directory
        const applicationId = req.params.applicationId || req.params.id || 'temp';
        // Validate applicationId to prevent path traversal
        if (!applicationId || typeof applicationId !== 'string') {
            return cb(new Error('Invalid application ID'));
        }
        // Check for path traversal patterns and ensure valid format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const numericRegex = /^\d+$/;
        const safeId = applicationId.replace(/[^a-zA-Z0-9-_]/g, '');
        if (applicationId !== safeId || (applicationId !== 'temp' && !uuidRegex.test(applicationId) && !numericRegex.test(applicationId))) {
            return cb(new Error('Invalid application ID format'));
        }
        const uploadDir = path.join(process.cwd(), 'uploads', applicationId);
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate secure filename
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E9);
        const sanitizedOriginalName = sanitizeFilename(file.originalname);
        const extension = path.extname(sanitizedOriginalName);
        const basename = path.basename(sanitizedOriginalName, extension);
        // Format: timestamp_random_originalname.ext
        const secureFilename = `${timestamp}_${randomSuffix}_${basename}${extension}`;
        cb(null, secureFilename);
    }
});
/**
 * Multer configuration with security settings
 */
export const secureUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES,
        fields: 20,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024 // 1MB for field values
    }
});
/**
 * Middleware to validate uploaded files after multer processing
 */
export const validateUploadedFiles = (req, res, next) => {
    const files = req.files;
    if (!files) {
        return next();
    }
    try {
        // Handle both array and object formats
        const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
        for (const file of fileArray) {
            // Validate file object structure
            const validation = securitySchemas.fileUpload.safeParse({
                mimetype: file.mimetype,
                size: file.size
            });
            if (!validation.success) {
                // Clean up uploaded file
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                return res.status(400).json({
                    error: 'File validation failed',
                    details: validation.error.errors
                });
            }
            // Additional virus scan simulation (placeholder for real antivirus integration)
            if (file.originalname.toLowerCase().includes('virus') ||
                file.originalname.toLowerCase().includes('malware')) {
                // Clean up uploaded file
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                return res.status(400).json({
                    error: 'File rejected by security scan'
                });
            }
        }
        next();
    }
    catch (error) {
        console.error('File validation error:', error);
        res.status(500).json({ error: 'File validation failed' });
    }
};
/**
 * Error handling middleware for file upload errors
 */
export const handleUploadErrors = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    error: 'File too large',
                    message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    error: 'Too many files',
                    message: `Maximum ${MAX_FILES} files allowed`
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    error: 'Unexpected field',
                    message: 'File field not expected'
                });
            default:
                return res.status(400).json({
                    error: 'Upload error',
                    message: error.message
                });
        }
    }
    if (error.message.includes('not allowed') || error.message.includes('path traversal')) {
        return res.status(400).json({
            error: 'File security violation',
            message: error.message
        });
    }
    next(error);
};
/**
 * Middleware to clean up temporary files on request end
 */
export const cleanupTempFiles = (req, res, next) => {
    const originalSend = res.send;
    res.send = function (data) {
        // Clean up temporary files if request failed
        if (res.statusCode >= 400 && req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        return originalSend.call(this, data);
    };
    next();
};
