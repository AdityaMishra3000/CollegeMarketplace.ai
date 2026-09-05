const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

/** Institutional email rule for the marketplace. */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu\.in$/;
/** E.164-ish Indian mobile number. */
const PHONE_PATTERN = /^\+91[0-9]{10}$/;

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [EMAIL_PATTERN, 'Must be a valid .edu.in email address']
        },
        // `select: false` keeps the hash out of every query result by default,
        // so a forgotten projection cannot leak it. Login opts in explicitly.
        password: { type: String, required: true, select: false },
        phone: {
            type: String,
            required: true,
            trim: true,
            match: [PHONE_PATTERN, 'Phone must be +91 followed by exactly 10 digits']
        },
        course: { type: String, required: true, default: 'Computer Science', maxlength: 80 },
        year: { type: String, required: true, default: '1st Year', maxlength: 20 },
        role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
        createdAt: { type: Date, default: Date.now }
    },
    { versionKey: false }
);

userSchema.pre('save', async function hashPassword(next) {
    if (!this.isModified('password')) return next();
    try {
        this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(BCRYPT_ROUNDS));
        next();
    } catch (err) {
        next(err);
    }
});

userSchema.methods.verifyPassword = function verifyPassword(candidate) {
    if (!this.password) {
        throw new Error('password was not selected on this document');
    }
    return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = { User, EMAIL_PATTERN, PHONE_PATTERN, BCRYPT_ROUNDS };
