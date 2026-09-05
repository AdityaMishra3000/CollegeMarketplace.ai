const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const env = require('./env');

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

let upload = null;

if (env.cloudinary.enabled) {
    cloudinary.config({
        cloud_name: env.cloudinary.cloudName,
        api_key: env.cloudinary.apiKey,
        api_secret: env.cloudinary.apiSecret,
        secure: true
    });

    upload = multer({
        storage: new CloudinaryStorage({
            cloudinary,
            params: { folder: 'college_marketplace', allowed_formats: ALLOWED_FORMATS }
        }),
        limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
        // Reject by declared MIME type before anything is streamed upstream.
        fileFilter(_req, file, cb) {
            if (!ALLOWED_MIME.has(file.mimetype)) {
                cb(new Error(`Unsupported image type: ${file.mimetype}`));
                return;
            }
            cb(null, true);
        }
    });
} else {
    console.warn(
        '[cloudinary] credentials not configured — POST /api/upload will return 503. ' +
            'Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET to enable uploads.'
    );
}

module.exports = {
    enabled: env.cloudinary.enabled,
    upload,
    MAX_UPLOAD_BYTES,
    ALLOWED_FORMATS
};
