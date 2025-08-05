const bcrypt = require('bcryptjs');
const { db } = require('./database');

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role || 'user';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.is_verified = data.is_verified || 0;
        this.reset_token = data.reset_token;
        this.reset_token_expires = data.reset_token_expires;
    }

    // Create a new user
    static async create(userData) {
        const { username, email, password, role = 'user' } = userData;
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = `INSERT INTO users (username, email, password, role) 
                     VALUES (?, ?, ?, ?)`;
        
        const result = await db.run(sql, [username, email, hashedPassword, role]);
        
        // Return the created user
        return await User.findById(result.lastID);
    }

    // Find user by ID
    static async findById(id) {
        const sql = `SELECT * FROM users WHERE id = ?`;
        const rows = await db.query(sql, [id]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new User(rows[0]);
    }

    // Find user by email
    static async findByEmail(email) {
        const sql = `SELECT * FROM users WHERE email = ?`;
        const rows = await db.query(sql, [email]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new User(rows[0]);
    }

    // Find user by username
    static async findByUsername(username) {
        const sql = `SELECT * FROM users WHERE username = ?`;
        const rows = await db.query(sql, [username]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new User(rows[0]);
    }

    // Get all users with pagination
    static async findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const sql = `SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const rows = await db.query(sql, [limit, offset]);
        
        return rows.map(row => new User(row));
    }

    // Update user
    async update(updateData) {
        const allowedFields = ['username', 'email', 'role', 'is_verified'];
        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(this.id);

        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await db.run(sql, values);

        // Refresh the user data
        const updatedUser = await User.findById(this.id);
        Object.assign(this, updatedUser);
        return this;
    }

    // Update password
    async updatePassword(newPassword) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        const sql = `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await db.run(sql, [hashedPassword, this.id]);
        
        this.password = hashedPassword;
        return this;
    }

    // Verify password
    async verifyPassword(password) {
        return await bcrypt.compare(password, this.password);
    }

    // Delete user
    async delete() {
        const sql = `DELETE FROM users WHERE id = ?`;
        await db.run(sql, [this.id]);
        return true;
    }

    // Set password reset token
    async setResetToken(token, expiresIn = 3600000) { // 1 hour default
        const expiryDate = new Date(Date.now() + expiresIn);
        const sql = `UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`;
        await db.run(sql, [token, expiryDate.toISOString(), this.id]);
        
        this.reset_token = token;
        this.reset_token_expires = expiryDate.toISOString();
        return this;
    }

    // Clear reset token
    async clearResetToken() {
        const sql = `UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?`;
        await db.run(sql, [this.id]);
        
        this.reset_token = null;
        this.reset_token_expires = null;
        return this;
    }

    // Verify reset token
    static async verifyResetToken(token) {
        const sql = `SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?`;
        const rows = await db.query(sql, [token, new Date().toISOString()]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new User(rows[0]);
    }

    // JSON representation (without password)
    toJSON() {
        const { password, reset_token, reset_token_expires, ...userWithoutSensitiveData } = this;
        return userWithoutSensitiveData;
    }

    // Update privacy settings
    static async updatePrivacySettings(userId, settings) {
        const sql = `UPDATE users SET privacy_settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        return await db.run(sql, [JSON.stringify(settings), userId]);
    }

    // Get privacy settings
    static async getPrivacySettings(userId) {
        const sql = `SELECT privacy_settings FROM users WHERE id = ?`;
        const rows = await db.query(sql, [userId]);
        
        if (rows.length === 0) {
            return null;
        }
        
        const settings = rows[0].privacy_settings;
        return settings ? JSON.parse(settings) : {};
    }

    // Update marketing consent
    static async updateMarketingConsent(userId, consent) {
        const sql = `UPDATE users SET marketing_consent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        return await db.run(sql, [consent ? 1 : 0, userId]);
    }

    // Update analytics consent
    static async updateAnalyticsConsent(userId, consent) {
        const sql = `UPDATE users SET analytics_consent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        return await db.run(sql, [consent ? 1 : 0, userId]);
    }

    // Set data retention date
    static async setDataRetentionDate(userId, retentionDate) {
        const sql = `UPDATE users SET data_retention_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        return await db.run(sql, [retentionDate, userId]);
    }
}

module.exports = User;