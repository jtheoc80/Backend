const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./middleware');
const logActivity = require('./logActivity');

// Mock email functions
const sendResetEmail = (email, token) => {
    console.log(`Sending password reset email to ${email} with token: ${token}`);
};

const sendVerificationEmail = (email, token) => {
    console.log(`Sending verification email to ${email} with token: ${token}`);
};

// Password Reset
router.post('/request_password_reset', async (req, res) => {
    const { email } = req.body;
    const token = crypto.randomBytes(32).toString('hex');

    try {
        // Save token to database associated with user
        const result = await db.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3 RETURNING id',
            [token, new Date(Date.now() + 3600000), email] // 1 hour expiry
        );
        
        if (result.rows.length > 0) {
            sendResetEmail(email, token);
            await logActivity(db, result.rows[0].id, 'password_reset_requested', { email }, 'success');
            res.json({ message: 'Password reset email sent' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ error: 'Failed to process password reset' });
    }
});

// Reset Password
router.post('/reset_password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    try {
        const result = await db.query(
            'SELECT id, email FROM users WHERE reset_token = $1 AND reset_token_expires > $2',
            [token, new Date()]
        );
        
        if (result.rows.length > 0) {
            const hashedPassword = await bcryptjs.hash(newPassword, 10);
            await db.query(
                'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
                [hashedPassword, result.rows[0].id]
            );
            
            await logActivity(db, result.rows[0].id, 'password_reset_completed', { email: result.rows[0].email }, 'success');
            res.json({ message: 'Password reset successful' });
        } else {
            res.status(400).json({ error: 'Invalid or expired token' });
        }
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;