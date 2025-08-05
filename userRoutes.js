import express from 'express';
import userController from './userController.js';
import authMiddleware from './authMiddleware.js';
import rateLimit from 'express-rate-limit';

// Rate limiter for sensitive routes
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const router = express.Router();

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes (require authentication)
router.get('/profile', profileLimiter, authMiddleware.authenticateToken, userController.getProfile);
router.put('/profile', authMiddleware.authenticateToken, userController.updateProfile);
router.post('/change-password', authMiddleware.authenticateToken, userController.changePassword);

// Token refresh
router.post('/refresh-token', authMiddleware.refreshToken);

// Admin routes
router.get('/users', authMiddleware.authenticateToken, userController.getAllUsers);
router.get('/users/:id', authMiddleware.authenticateToken, userController.getUserById);
router.delete('/users/:id', authMiddleware.authenticateToken, userController.deleteUser);

export default router;