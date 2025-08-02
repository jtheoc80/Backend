const bcrypt = require('bcryptjs');

class User {
    constructor(id, email, passwordHash, role = 'user') {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.createdAt = new Date();
        this.isVerified = false;
    }

    // Hash password before storing
    static async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    // Verify password
    async verifyPassword(password) {
        return await bcrypt.compare(password, this.passwordHash);
    }

    // Get user info without sensitive data
    toSafeJSON() {
        return {
            id: this.id,
            email: this.email,
            role: this.role,
            createdAt: this.createdAt,
            isVerified: this.isVerified
        };
    }
}

module.exports = User;