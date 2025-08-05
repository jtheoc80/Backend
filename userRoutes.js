const express = require('express');
const router = express.Router();
const userController = require('./userController');
const { 
    verifyToken, 
    requireAdmin, 
    requireAdminOrOwner,
    rateLimit 
} = require('./authMiddleware');

// Rate limiting for authentication routes
const authRateLimit = rateLimit(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
const generalRateLimit = rateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes

// Public routes
router.post('/register', authRateLimit, userController.register);
router.post('/login', authRateLimit, userController.login);
router.post('/request-password-reset', authRateLimit, userController.requestPasswordReset);
router.post('/reset-password', authRateLimit, userController.resetPassword);

// Test token generation (for development/testing only)
router.post('/test-token', generalRateLimit, userController.generateTestToken);

// Protected routes (require authentication)
router.get('/profile', generalRateLimit, verifyToken, userController.getProfile);
router.put('/profile', generalRateLimit, verifyToken, userController.updateProfile);
router.put('/change-password', generalRateLimit, verifyToken, userController.changePassword);

// Admin routes
router.get('/users', generalRateLimit, verifyToken, requireAdmin, userController.getAllUsers);
router.get('/users/:id', generalRateLimit, verifyToken, requireAdminOrOwner, userController.getUserById);
router.put('/users/:id', generalRateLimit, verifyToken, requireAdmin, userController.updateUserById);
router.delete('/users/:id', generalRateLimit, verifyToken, requireAdmin, userController.deleteUserById);

module.exports = router;