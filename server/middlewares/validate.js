/**
 * Lightweight validation middleware factory.
 * Usage:
 *   router.post('/signup', validate(['companyName','companyEmail','walletAddress']), controller)
 */

const validate = (requiredFields = []) => (req, res, next) => {
    const missing = requiredFields.filter((field) => {
        const val = req.body[field];
        return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
    });

    if (missing.length > 0) {
        const err = new Error(`Missing required fields: ${missing.join(', ')}`);
        err.statusCode = 400;
        return next(err);
    }

    next();
};

/** Simple email format check */
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Validate email in body, attaches error to next() */
const validateEmail = (field = 'email') => (req, res, next) => {
    const val = req.body[field];
    if (val && !isValidEmail(val)) {
        const err = new Error(`Invalid email format for field: ${field}`);
        err.statusCode = 400;
        return next(err);
    }
    next();
};

module.exports = { validate, validateEmail };