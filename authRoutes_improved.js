const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const { asyncHandler, validateBody, passwordResetSchema } = require('./errorHandlerCommonJS');

// Mock email functions
const sendResetEmail = (email, token) => {
    console.log(`Sending password reset email to ${email} with token: ${token}`);
};

const sendVerificationEmail = (email, token) => {
    console.log(`Sending verification email to ${email} with token: ${token}`);
};

// Password Reset - Now with proper error handling and validation
router.post('/request_password_reset', validateBody(passwordResetSchema), asyncHandler(async (req, res) => {
    const { email } = req.body;
    const token = crypto.randomBytes(32).toString('hex');

    // Save token to database associated with user email
    // In a real implementation, this would save to a database
    console.log(`Password reset token generated for ${email}: ${token}`);
    
    // Send reset email
    try {
        await sendResetEmail(email, token);
        res.json({ 
            success: true, 
            message: 'Password reset email sent successfully' 
        });
    } catch (error) {
        throw new Error('Failed to send password reset email');
    }
}));

// Email Verification - Added proper error handling
router.post('/request_email_verification', validateBody(passwordResetSchema), asyncHandler(async (req, res) => {
    const { email } = req.body;
    const token = crypto.randomBytes(32).toString('hex');

    // Save verification token to database
    console.log(`Email verification token generated for ${email}: ${token}`);
    
    try {
        await sendVerificationEmail(email, token);
        res.json({ 
            success: true, 
            message: 'Email verification sent successfully' 
        });
    } catch (error) {
        throw new Error('Failed to send verification email');
    }
}));

// 2FA Setup - Added error handling
router.post('/setup_2fa', asyncHandler(async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({
            name: 'ValveChain API',
            length: 32
        });
        
        // In a real implementation, save the secret to user's profile in database
        console.log('2FA secret generated');
        
        res.json({
            success: true,
            secret: secret.base32,
            qrCodeUrl: secret.otpauth_url
        });
    } catch (error) {
        throw new Error('Failed to generate 2FA secret');
    }
}));

// Error handling middleware for this router
router.use((error, req, res, next) => {
    console.error('Auth route error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred'
    });
});

module.exports = router;