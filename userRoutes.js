const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile } = require('./userController');
const { authenticateToken } = require('./middleware');
const rateLimit = require('express-rate-limit');

// Set up rate limiter for protected routes
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', profileLimiter, authenticateToken, getUserProfile);

module.exports = router;