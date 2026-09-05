const express = require('express');
const ApiError = require('../utils/ApiError');
const { authenticate } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');
const { enabled, upload } = require('../config/cloudinary');

const router = express.Router();

/**
 * Image upload.
 *
 * Requires authentication and is rate limited: this endpoint spends money on a
 * third-party API. Size and MIME type are enforced by the multer configuration.
 *
 * When Cloudinary credentials are absent the route says so plainly instead of
 * signing requests with the literal string 'demo' and failing upstream.
 */
router.post('/', authenticate, uploadLimiter, (req, res, next) => {
    if (!enabled) {
        return next(
            ApiError.unavailable('Image uploads are not configured on this server', {
                code: 'UPLOADS_DISABLED'
            })
        );
    }

    return upload.single('image')(req, res, (err) => {
        if (err) return next(err);
        if (!req.file) return next(ApiError.badRequest('No image file was provided'));
        return res.status(201).json({ imageUrl: req.file.path });
    });
});

module.exports = router;
