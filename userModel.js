const bcrypt = require('bcryptjs');
const { db } = require('./database');

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role || 'user';
        this.organization_id = data.organization_id;
        this.organization_role = data.organization_role || 'user';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.is_verified = data.is_verified || 0;
        this.reset_token = data.reset_token;
        this.reset_token_expires = data.reset_token_expires;
    }

    // Create a new user
    static async create(userData) {
        const { username, email, password, role = 'user', organization_id, organization_role = 'user' } = userData;
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = `INSERT INTO users (username, email, password, role, organization_id, organization_role) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        
        const result = await db.run(sql, [username, email, hashedPassword, role, organization_id, organization_role]);
        
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
        const allowedFields = ['username', 'email', 'role', 'is_verified', 'organization_id', 'organization_role'];
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

    // Get all users within an organization
    static async findByOrganization(organizationId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const sql = `SELECT * FROM users WHERE organization_id = ? ORDER BY organization_role DESC, created_at DESC LIMIT ? OFFSET ?`;
        const rows = await db.query(sql, [organizationId, limit, offset]);
        
        return rows.map(row => new User(row));
    }

    // Check if user is organization admin
    isOrganizationAdmin() {
        return this.organization_role === 'admin';
    }

    // Check if user can manage other user within organization
    canManageUser(targetUser) {
        // System admin can manage anyone
        if (this.role === 'admin') return true;
        
        // Organization admin can manage users in their organization OR grant access to users without organization
        if (this.organization_role === 'admin' && this.organization_id) {
            // Can manage users in same organization
            if (this.organization_id === targetUser.organization_id) {
                return true;
            }
            // Can grant access to users without organization
            if (!targetUser.organization_id) {
                return true;
            }
        }
        
        return false;
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
}

module.exports = User;