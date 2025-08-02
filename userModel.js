const { db } = require('./middleware');

// User model with database operations
const User = {
    // Find user by ID
    async findById(id) {
        try {
            const result = await db.query(
                'SELECT id, username, email, role, is_verified, created_at, updated_at FROM users WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } catch (err) {
            console.error('Error finding user by ID:', err);
            throw err;
        }
    },

    // Find user by username or email
    async findByUsernameOrEmail(identifier) {
        try {
            const result = await db.query(
                'SELECT * FROM users WHERE username = $1 OR email = $1',
                [identifier]
            );
            return result.rows[0] || null;
        } catch (err) {
            console.error('Error finding user by username/email:', err);
            throw err;
        }
    },

    // Create new user
    async create(userData) {
        const { username, email, password, role = 'user' } = userData;
        try {
            const result = await db.query(
                'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at',
                [username, email, password, role]
            );
            return result.rows[0];
        } catch (err) {
            console.error('Error creating user:', err);
            throw err;
        }
    },

    // Update user
    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);
        const query = `
            UPDATE users 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $${paramCount} 
            RETURNING id, username, email, role, updated_at
        `;

        try {
            const result = await db.query(query, values);
            return result.rows[0] || null;
        } catch (err) {
            console.error('Error updating user:', err);
            throw err;
        }
    },

    // Delete user
    async delete(id) {
        try {
            const result = await db.query(
                'DELETE FROM users WHERE id = $1 RETURNING id',
                [id]
            );
            return result.rows[0] || null;
        } catch (err) {
            console.error('Error deleting user:', err);
            throw err;
        }
    },

    // Get all users (admin function)
    async findAll(limit = 50, offset = 0) {
        try {
            const result = await db.query(
                'SELECT id, username, email, role, is_verified, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            );
            return result.rows;
        } catch (err) {
            console.error('Error finding all users:', err);
            throw err;
        }
    },

    // Verify user email
    async verifyEmail(id) {
        try {
            const result = await db.query(
                'UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1 RETURNING id, username, email',
                [id]
            );
            return result.rows[0] || null;
        } catch (err) {
            console.error('Error verifying user email:', err);
            throw err;
        }
    }
};

module.exports = User;