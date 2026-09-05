const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const validate = require('../middleware/validate');
const serialize = require('../serializers');
const productService = require('../services/productService');

const router = express.Router();

/**
 * A seller's public listings.
 *
 * Public, so it goes through the card serializer: this endpoint used to populate
 * and return the seller's email address to anonymous callers.
 */
router.get(
    '/:userId/products',
    validate.sellerProducts,
    asyncHandler(async (req, res) => {
        const { items, meta } = await productService.listProducts(
            { ...req.query, seller: req.params.userId },
            { onlyAvailable: true }
        );
        res.json({ products: items.map(serialize.productCard), pagination: meta });
    })
);

module.exports = router;
