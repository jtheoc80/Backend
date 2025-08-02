const Joi = require('joi');

// Async route wrapper for consistent error handling
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            console.error('Route error:', error);
            
            // Return consistent JSON error response
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message || 'An unexpected error occurred'
            });
        });
    };
};

// Validation middleware factory
const validateBody = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: error.details[0].message
            });
        }
        next();
    };
};

// Auth routes validation schemas
const passwordResetSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Valid email address is required',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
    })
});

module.exports = {
    asyncHandler,
    validateBody,
    passwordResetSchema
};