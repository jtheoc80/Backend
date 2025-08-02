"const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const speakeasy = require('speakeasy');

// Mock email functions
const sendResetEmail = (email, token) => {
    console.log(`Sending password reset email to ${email} with token: ${token}`);
};

const sendVerificationEmail = (email, token) => {
    console.log(`Sending verification email to ${email} with token: ${token}`);
};

// Password Reset
router.post('/request_password_reset', (req, res) => {
    const { email } = req.body;
    const token = crypto.randomBytes(32).toString('hex');

    // Save token to database associated with ud..." 
