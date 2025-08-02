import Joi from 'joi';

// Async route wrapper for consistent error handling
export const asyncHandler = (fn) => {
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
export const validateBody = (schema) => {
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

// Validation schemas for index.js routes
export const valveRegistrationSchema = Joi.object({
    serialNumber: Joi.string().required().messages({
        'string.empty': 'Serial number is required',
        'any.required': 'Serial number is required'
    }),
    details: Joi.string().required().messages({
        'string.empty': 'Details are required',
        'any.required': 'Details are required'
    })
});

export const valveTransferSchema = Joi.object({
    serialNumber: Joi.string().required().messages({
        'string.empty': 'Serial number is required',
        'any.required': 'Serial number is required'
    }),
    to: Joi.string().required().messages({
        'string.empty': 'Recipient address is required',
        'any.required': 'Recipient address is required'
    })
});

export const maintenanceSchema = Joi.object({
    serialNumber: Joi.string().required().messages({
        'string.empty': 'Serial number is required',
        'any.required': 'Serial number is required'
    }),
    description: Joi.string().required().messages({
        'string.empty': 'Description is required',
        'any.required': 'Description is required'
    }),
    reportHash: Joi.string().required().messages({
        'string.empty': 'Report hash is required',
        'any.required': 'Report hash is required'
    })
});

export const repairRequestSchema = Joi.object({
    serialNumber: Joi.string().required().messages({
        'string.empty': 'Serial number is required',
        'any.required': 'Serial number is required'
    }),
    contractor: Joi.string().required().messages({
        'string.empty': 'Contractor address is required',
        'any.required': 'Contractor address is required'
    }),
    amountEth: Joi.string().required().messages({
        'string.empty': 'Amount in ETH is required',
        'any.required': 'Amount in ETH is required'
    })
});

export const repairSchema = Joi.object({
    serialNumber: Joi.string().required().messages({
        'string.empty': 'Serial number is required',
        'any.required': 'Serial number is required'
    }),
    preTestHash: Joi.string().required().messages({
        'string.empty': 'Pre-test hash is required',
        'any.required': 'Pre-test hash is required'
    }),
    repairHash: Joi.string().required().messages({
        'string.empty': 'Repair hash is required',
        'any.required': 'Repair hash is required'
    }),
    postTestHash: Joi.string().required().messages({
        'string.empty': 'Post-test hash is required',
        'any.required': 'Post-test hash is required'
    })
});

// Auth routes validation schemas
export const passwordResetSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Valid email address is required',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
    })
});