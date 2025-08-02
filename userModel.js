const bcrypt = require('bcryptjs');

// Simple in-memory storage for users and tokens
class UserModel {
    constructor() {
        this.users = new Map(); // email -> user object
        this.resetTokens = new Map(); // token -> { email, expires, hashedToken }
        this.verificationTokens = new Map(); // token -> { email, expires, hashedToken }
        this.twoFactorSecrets = new Map(); // email -> secret
    }

    // User management
    findUserByEmail(email) {
        return this.users.get(email.toLowerCase());
    }

    createUser(email, hashedPassword) {
        const user = {
            email: email.toLowerCase(),
            password: hashedPassword,
            emailVerified: false,
            twoFactorEnabled: false,
            createdAt: new Date()
        };
        this.users.set(email.toLowerCase(), user);
        return user;
    }

    updateUserPassword(email, hashedPassword) {
        const user = this.users.get(email.toLowerCase());
        if (user) {
            user.password = hashedPassword;
            return true;
        }
        return false;
    }

    verifyUserEmail(email) {
        const user = this.users.get(email.toLowerCase());
        if (user) {
            user.emailVerified = true;
            return true;
        }
        return false;
    }

    // Token management with expiry
    async saveResetToken(email, token, expiryMinutes = 15) {
        const hashedToken = await bcrypt.hash(token, 10);
        const expires = new Date(Date.now() + expiryMinutes * 60 * 1000);
        this.resetTokens.set(token, { email: email.toLowerCase(), expires, hashedToken });
        
        // Clean up expired tokens
        this.cleanupExpiredTokens(this.resetTokens);
    }

    async saveVerificationToken(email, token, expiryHours = 24) {
        const hashedToken = await bcrypt.hash(token, 10);
        const expires = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
        this.verificationTokens.set(token, { email: email.toLowerCase(), expires, hashedToken });
        
        // Clean up expired tokens
        this.cleanupExpiredTokens(this.verificationTokens);
    }

    validateResetToken(token) {
        const tokenData = this.resetTokens.get(token);
        if (!tokenData || tokenData.expires < new Date()) {
            if (tokenData) this.resetTokens.delete(token);
            return null;
        }
        return tokenData;
    }

    validateVerificationToken(token) {
        const tokenData = this.verificationTokens.get(token);
        if (!tokenData || tokenData.expires < new Date()) {
            if (tokenData) this.verificationTokens.delete(token);
            return null;
        }
        return tokenData;
    }

    consumeResetToken(token) {
        const tokenData = this.resetTokens.get(token);
        if (tokenData) {
            this.resetTokens.delete(token);
            return tokenData;
        }
        return null;
    }

    consumeVerificationToken(token) {
        const tokenData = this.verificationTokens.get(token);
        if (tokenData) {
            this.verificationTokens.delete(token);
            return tokenData;
        }
        return null;
    }

    // Two-Factor Authentication
    save2FASecret(email, secret) {
        this.twoFactorSecrets.set(email.toLowerCase(), secret);
    }

    get2FASecret(email) {
        return this.twoFactorSecrets.get(email.toLowerCase());
    }

    enable2FA(email) {
        const user = this.users.get(email.toLowerCase());
        if (user) {
            user.twoFactorEnabled = true;
            return true;
        }
        return false;
    }

    // Cleanup expired tokens
    cleanupExpiredTokens(tokenMap) {
        const now = new Date();
        for (const [token, data] of tokenMap.entries()) {
            if (data.expires < now) {
                tokenMap.delete(token);
            }
        }
    }
}

// Export singleton instance
module.exports = new UserModel();