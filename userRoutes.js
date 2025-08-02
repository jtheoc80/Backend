import express from 'express';
import userController from './userController.js';
import authMiddleware from './authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes (require authentication)
router.get('/profile', authMiddleware.authenticateToken, userController.getProfile);
router.put('/profile', authMiddleware.authenticateToken, userController.updateProfile);
router.post('/change-password', authMiddleware.authenticateToken, userController.changePassword);

// Token refresh
router.post('/refresh-token', authMiddleware.refreshToken);

// Admin routes
router.get('/users', authMiddleware.authenticateToken, userController.getAllUsers);
router.get('/users/:id', authMiddleware.authenticateToken, userController.getUserById);
router.delete('/users/:id', authMiddleware.authenticateToken, userController.deleteUser);

export default router;