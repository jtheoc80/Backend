const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// Rate limiting for sensitive authentication routes
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 password reset requests per windowMs
  message: { error: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mock email functions - in production these should use proper email service
const sendResetEmail = (email, hashedToken) => {
    // Only log that email was sent, never log the actual token
    console.log(`Password reset email sent to: ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);
};

const sendVerificationEmail = (email, hashedToken) => {
    // Only log that email was sent, never log the actual token  
    console.log(`Verification email sent to: ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);
};

// Hash token before storage to prevent rainbow table attacks
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

// Password Reset Request - with rate limiting
router.post('/request_password_reset', authRateLimit, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email address required' });
        }

        // Generate secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = hashToken(token);
        
        // Set expiration time (1 hour from now)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        // TODO: Save hashed token to database associated with user email
        // Example: await db.query('UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?', 
        //                        [hashedToken, expiresAt, email]);

        // Send email with original token (not hashed)
        sendResetEmail(email, token); // Only original token sent in email
        
        // Never include the actual token in the response
        res.json({ 
            success: true, 
            message: 'Password reset email sent if account exists'
        });
        
    } catch (error) {
        console.error('Password reset request error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Password Reset Confirmation - with rate limiting
router.post('/reset_password', authRateLimit, async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        
        if (!email || !token || !newPassword) {
            return res.status(400).json({ error: 'Email, token, and new password required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Hash the provided token to compare with stored hash
        const hashedToken = hashToken(token);
        
        // TODO: Verify token from database
        // Example: const user = await db.query('SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_expires > NOW()', 
        //                                     [email, hashedToken]);
        
        // Hash new password before storing
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // TODO: Update password and clear reset token
        // Example: await db.query('UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE email = ?', 
        //                        [hashedPassword, email]);

        res.json({ 
            success: true, 
            message: 'Password updated successfully' 
        });
        
    } catch (error) {
        console.error('Password reset confirmation error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Email Verification Request - with rate limiting  
router.post('/request_email_verification', authRateLimit, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email address required' });
        }

        // Generate secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = hashToken(token);
        
        // Set expiration time (24 hours from now)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // TODO: Save hashed token to database
        // Example: await db.query('UPDATE users SET verification_token = ?, verification_expires = ? WHERE email = ?', 
        //                        [hashedToken, expiresAt, email]);

        sendVerificationEmail(email, token);
        
        res.json({ 
            success: true, 
            message: 'Verification email sent if account exists' 
        });
        
    } catch (error) {
        console.error('Email verification request error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;