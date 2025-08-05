const { db } = require('./database');

class Organization {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.blockchain_registered = data.blockchain_registered || 0;
        this.blockchain_registration_hash = data.blockchain_registration_hash;
        this.wallet_address = data.wallet_address;
        this.description = data.description;
        this.is_active = data.is_active !== undefined ? data.is_active : 1;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new organization
    static async create(orgData) {
        const { id, name, description, wallet_address } = orgData;
        
        const sql = `INSERT INTO organizations (id, name, description, wallet_address) 
                     VALUES (?, ?, ?, ?)`;
        
        await db.run(sql, [id, name, description, wallet_address]);
        
        return await Organization.findById(id);
    }

    // Find organization by ID
    static async findById(id) {
        const sql = `SELECT * FROM organizations WHERE id = ?`;
        const rows = await db.query(sql, [id]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Organization(rows[0]);
    }

    // Find organization by wallet address
    static async findByWalletAddress(walletAddress) {
        const sql = `SELECT * FROM organizations WHERE wallet_address = ?`;
        const rows = await db.query(sql, [walletAddress]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Organization(rows[0]);
    }

    // Get all organizations
    static async findAll() {
        const sql = `SELECT * FROM organizations WHERE is_active = 1 ORDER BY created_at DESC`;
        const rows = await db.query(sql);
        
        return rows.map(row => new Organization(row));
    }

    // Check if any organization is registered on blockchain
    static async isAnyRegisteredOnBlockchain() {
        const sql = `SELECT COUNT(*) as count FROM organizations WHERE blockchain_registered = 1`;
        const rows = await db.query(sql);
        
        return rows[0].count > 0;
    }

    // Register organization on blockchain
    async registerOnBlockchain(transactionHash) {
        const sql = `UPDATE organizations 
                     SET blockchain_registered = 1, 
                         blockchain_registration_hash = ?, 
                         updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        
        await db.run(sql, [transactionHash, this.id]);
        
        // Record in blockchain registrations table
        await db.run(`INSERT INTO blockchain_registrations (organization_id, transaction_hash, status) 
                      VALUES (?, ?, 'confirmed')`, [this.id, transactionHash]);
        
        this.blockchain_registered = 1;
        this.blockchain_registration_hash = transactionHash;
        
        return this;
    }

    // Update organization
    async update(updateData) {
        const allowedFields = ['name', 'description', 'wallet_address'];
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

        const sql = `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`;
        await db.run(sql, values);

        // Refresh the organization data
        const updatedOrg = await Organization.findById(this.id);
        Object.assign(this, updatedOrg);
        return this;
    }

    // Get organization admins
    async getAdmins() {
        const sql = `SELECT * FROM users 
                     WHERE organization_id = ? AND organization_role = 'admin' AND role != 'disabled'`;
        const rows = await db.query(sql, [this.id]);
        
        return rows;
    }

    // Get organization users
    async getUsers() {
        const sql = `SELECT * FROM users 
                     WHERE organization_id = ? AND role != 'disabled'
                     ORDER BY organization_role DESC, created_at ASC`;
        const rows = await db.query(sql, [this.id]);
        
        return rows;
    }

    // Get organization projects
    async getProjects() {
        const sql = `SELECT * FROM projects 
                     WHERE organization_id = ? 
                     ORDER BY status ASC, created_at DESC`;
        const rows = await db.query(sql, [this.id]);
        
        return rows;
    }

    // JSON representation
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            blockchain_registered: this.blockchain_registered,
            blockchain_registration_hash: this.blockchain_registration_hash,
            wallet_address: this.wallet_address,
            description: this.description,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Organization;