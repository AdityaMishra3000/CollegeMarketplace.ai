const express = require('express');
const { User } = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler, pick } = require('../utils/helpers');
const { issueToken, authenticate } = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const serialize = require('../serializers');

const router = express.Router();

const REGISTRATION_FIELDS = ['name', 'email', 'password', 'phone', 'course', 'year'];

router.post(
    '/register',
    registerLimiter,
    validate.register,
    asyncHandler(async (req, res) => {
        // Whitelisted: a request body containing `role: "admin"` used to be
        // spread straight into User.create().
        const data = pick(req.body, REGISTRATION_FIELDS);

        // Bootstrap rule preserved: the very first account is the admin.
        // `exists` is exact and cheap; an estimated count could wrongly report
        // an empty collection and hand out admin.
        const isFirstUser = (await User.exists({})) === null;

        const user = await User.create({
            ...data,
            course: data.course || 'General Studies',
            year: data.year || '1st Year',
            role: isFirstUser ? 'admin' : 'student'
        });

        res.status(201).json({
            token: issueToken(user._id),
            user: serialize.userSelf(user)
        });
    })
);

router.post(
    '/login',
    authLimiter,
    validate.login,
    asyncHandler(async (req, res) => {
        // `password` is `select: false` on the schema, so it must be requested.
        const user = await User.findOne({ email: req.body.email }).select('+password');

        // One message for both branches: revealing "no such account" lets an
        // attacker enumerate which students are registered.
        const ok = user && (await user.verifyPassword(req.body.password));
        if (!ok) throw ApiError.badRequest('Invalid email or password');

        res.json({
            token: issueToken(user._id),
            user: serialize.userSelf(user)
        });
    })
);

router.get('/me', authenticate, (req, res) => {
    res.json({ user: serialize.userSelf(req.user) });
});

module.exports = router;
