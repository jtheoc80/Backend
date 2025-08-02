const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile } = require('./userController');
const { authenticateToken } = require('./middleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', authenticateToken, getUserProfile);

module.exports = router;