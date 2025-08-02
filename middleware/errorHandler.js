// Error handling middleware and utilities

/**
 * Async handler wrapper to catch errors and pass them to error middleware
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function with error handling
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Standardized error response format
 * @param {Object} error - Error object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @returns {Object} - Standardized error response
 */
export const createErrorResponse = (error, statusCode = 500) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
        success: false,
        error: {
            message: error.message || 'Internal server error',
            status: statusCode,
            ...(isProduction ? {} : { stack: error.stack })
        }
    };
};

/**
 * Express error handling middleware
 * Catches all errors and sends consistent JSON responses
 */
export const errorHandler = (err, req, res, next) => {
    console.error('Error caught by middleware:', err);

    // Default error response
    let statusCode = 500;
    let message = 'Internal server error';

    // Handle different types of errors
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
    } else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    } else if (err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate field value';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    } else if (err.message) {
        message = err.message;
    }

    // Send error response
    const errorResponse = createErrorResponse({ message, stack: err.stack }, statusCode);
    res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for routes that don't exist
 */
export const notFoundHandler = (req, res) => {
    const errorResponse = createErrorResponse(
        { message: `Route ${req.originalUrl} not found` },
        404
    );
    res.status(404).json(errorResponse);
};