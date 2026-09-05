const express = require('express');

const router = express.Router();

/**
 * API surface. Mount order matters only in that `/products/me` must be declared
 * inside the products router before `/products/:id`, which it is.
 */
router.use('/', require('./meta.routes')); // /health, /stats, /meta/taxonomy
router.use('/auth', require('./auth.routes'));
router.use('/products', require('./products.routes'));
router.use('/users', require('./users.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/ai', require('./ai.routes'));
router.use('/upload', require('./upload.routes'));

module.exports = router;
