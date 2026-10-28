const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const MAX_VIDEO_BYTES = 30 * 1024 * 1024; // 30 MB
const ALLOWED_MIME = new Set([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/3gpp'
]);

const uploadDir = path.resolve(__dirname, '../../uploads/verification_videos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(_req, _file, cb) {
        cb(null, uploadDir);
    },
    filename(_req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `verify-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_VIDEO_BYTES,
        files: 1
    },
    fileFilter(_req, file, cb) {
        if (!ALLOWED_MIME.has(file.mimetype.toLowerCase())) {
            cb(
                ApiError.badRequest(
                    `Unsupported video format (${file.mimetype}). Accepted formats: MP4, WebM.`
                )
            );
            return;
        }
        cb(null, true);
    }
});

/**
 * Express middleware wrapper to catch Multer errors (e.g. LIMIT_FILE_SIZE)
 * and return standard ApiError JSON responses.
 */
function handleVideoUpload(req, res, next) {
    upload.single('video')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(
                    ApiError.badRequest('Video exceeds the maximum 30 MB upload size limit.', {
                        code: 'VIDEO_TOO_LARGE'
                    })
                );
            }
            return next(ApiError.badRequest(err.message));
        }
        if (err) return next(err);
        return next();
    });
}

module.exports = {
    handleVideoUpload,
    MAX_VIDEO_BYTES,
    uploadDir
};
