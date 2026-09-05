const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const { CATEGORIES, CONDITIONS } = require('../config/taxonomy');
const db = require('../config/db');
const mlClient = require('../services/mlClient');
const productService = require('../services/productService');

const router = express.Router();

/**
 * Liveness/readiness. Reports the dependencies rather than just answering "OK",
 * so a half-broken deployment is visible without reading logs.
 */
router.get(
    '/health',
    asyncHandler(async (_req, res) => {
        const ml = await mlClient.health();
        const dbConnected = db.isConnected();
        res.status(dbConnected ? 200 : 503).json({
            status: dbConnected ? 'OK' : 'DEGRADED',
            database: dbConnected ? 'connected' : 'disconnected',
            mlService: ml.reachable ? 'reachable' : 'unreachable',
            uptimeSeconds: Math.round(process.uptime())
        });
    })
);

/**
 * THE PUBLISHED DATA CONTRACT.
 *
 * The canonical category and condition vocabulary, served so clients can read it
 * instead of hardcoding a copy that drifts. The frontend keeps a mirror for
 * instant rendering; a backend test asserts the two are identical.
 */
router.get('/meta/taxonomy', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
        categories: CATEGORIES,
        conditions: CONDITIONS
    });
});

/**
 * Public marketplace figures.
 *
 * Deliberately narrower than the admin version: user counts are not public
 * information, and this endpoint requires no authentication.
 */
router.get(
    '/stats',
    asyncHandler(async (_req, res) => {
        const stats = await productService.statistics();
        res.json({
            totalProducts: stats.totalProducts,
            totalItems: stats.totalItems,
            totalValue: stats.totalValue,
            avgPrice: stats.avgPrice
        });
    })
);

module.exports = router;
