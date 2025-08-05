const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('./userModel');
const { sendEmail } = require('./emailUtils');
const { rateLimiter, validateEmail, validatePassword } = require('./authMiddleware');

// Rate limiting for auth endpoints
const authRateLimit = rateLimiter.limit(5, 15); // 5 attempts per 15 minutes

// Enhanced email functions with fallback to console logging
const sendResetEmail = async (email, token) => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    const subject = 'Password Reset Request';
    const text = `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`;
    
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            await sendEmail(email, subject, text);
            console.log(`Password reset email sent to ${email}`);
        } catch (error) {
            console.error(`Failed to send reset email to ${email}:`, error);
            console.log(`[MOCK EMAIL] Password reset for ${email}: ${resetUrl}`);
        }
    } else {
        console.log(`[MOCK EMAIL] Password reset for ${email}: ${resetUrl}`);
    }
};

const sendVerificationEmail = async (email, token) => {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    const subject = 'Email Verification';
    const text = `Please verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.`;
    
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            await sendEmail(email, subject, text);
            console.log(`Verification email sent to ${email}`);
        } catch (error) {
            console.error(`Failed to send verification email to ${email}:`, error);
            console.log(`[MOCK EMAIL] Email verification for ${email}: ${verifyUrl}`);
        }
    } else {
        console.log(`[MOCK EMAIL] Email verification for ${email}: ${verifyUrl}`);
    }
};

// Password Reset Flow
router.post('/request_password_reset', validateEmail, authRateLimit, async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if user exists
        const user = userModel.findUserByEmail(email);
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'If the email exists, a password reset link has been sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        await userModel.saveResetToken(email, token, 15); // 15 minutes expiry

        await sendResetEmail(email, token);
        res.json({ message: 'If the email exists, a password reset link has been sent.' });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/reset_password', validatePassword, authRateLimit, async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Reset token is required' });
        }

        const tokenData = userModel.validateResetToken(token);
        if (!tokenData) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Update password and consume token
        const updated = userModel.updateUserPassword(tokenData.email, hashedPassword);
        userModel.consumeResetToken(token);

        if (updated) {
            res.json({ message: 'Password successfully reset' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Email Verification Flow
router.post('/send_verification', validateEmail, authRateLimit, async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = userModel.findUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.emailVerified) {
            return res.json({ message: 'Email is already verified' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        await userModel.saveVerificationToken(email, token, 24); // 24 hours expiry

        await sendVerificationEmail(email, token);
        res.json({ message: 'Verification email sent' });
    } catch (error) {
        console.error('Send verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/verify_email', authRateLimit, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        const tokenData = userModel.validateVerificationToken(token);
        if (!tokenData) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        // Verify email and consume token
        const verified = userModel.verifyUserEmail(tokenData.email);
        userModel.consumeVerificationToken(token);

        if (verified) {
            res.json({ message: 'Email successfully verified' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Two-Factor Authentication Setup
router.post('/setup_2fa', validateEmail, authRateLimit, async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = userModel.findUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.emailVerified) {
            return res.status(400).json({ error: 'Email must be verified before enabling 2FA' });
        }

        const secret = speakeasy.generateSecret({
            name: `YourApp (${email})`,
            issuer: 'YourApp',
            length: 20
        });

        // Save secret temporarily (not enabled until verification)
        userModel.save2FASecret(email, secret.base32);

        res.json({ 
            secret: secret.base32,
            qr_code: secret.otpauth_url,
            manual_entry_key: secret.base32,
            message: 'Scan the QR code with your authenticator app, then verify to enable 2FA'
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/verify_2fa', authRateLimit, async (req, res) => {
    try {
        const { email, token } = req.body;

        if (!email || !token) {
            return res.status(400).json({ error: 'Email and TOTP token are required' });
        }

        const user = userModel.findUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const secret = userModel.get2FASecret(email);
        if (!secret) {
            return res.status(400).json({ error: '2FA not set up for this user' });
        }

        // Verify TOTP token
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow for time drift
        });

        if (verified) {
            userModel.enable2FA(email);
            res.json({ message: '2FA successfully enabled' });
        } else {
            res.status(400).json({ error: 'Invalid 2FA token' });
        }
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login endpoint that supports 2FA
router.post('/login', validateEmail, validatePassword, authRateLimit, async (req, res) => {
    try {
        const { email, password, totpToken } = req.body;

        const user = userModel.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
            if (!totpToken) {
                return res.status(200).json({ 
                    message: '2FA token required',
                    requires2FA: true 
                });
            }

            const secret = userModel.get2FASecret(email);
            const verified = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: totpToken,
                window: 2
            });

            if (!verified) {
                return res.status(401).json({ error: 'Invalid 2FA token' });
            }
        }

        // Generate JWT token
        const jwtToken = jwt.sign(
            { email: user.email, verified: user.emailVerified },
            jwtSecret,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token: jwtToken,
            user: {
                email: user.email,
                emailVerified: user.emailVerified,
                twoFactorEnabled: user.twoFactorEnabled
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User registration endpoint
router.post('/register', validateEmail, validatePassword, authRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user already exists
        const existingUser = userModel.findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Create user
        const user = userModel.createUser(email, hashedPassword);

        // Send verification email
        const token = crypto.randomBytes(32).toString('hex');
        await userModel.saveVerificationToken(email, token, 24);
        await sendVerificationEmail(email, token);

        res.status(201).json({
            message: 'User created successfully. Please check your email for verification.',
            user: {
                email: user.email,
                emailVerified: user.emailVerified
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;