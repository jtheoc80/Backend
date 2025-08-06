const { db } = require('./database');

class Distributor {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.wallet_address = data.wallet_address;
        this.contact_email = data.contact_email;
        this.contact_phone = data.contact_phone;
        this.address = data.address;
        this.blockchain_registration_hash = data.blockchain_registration_hash;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new distributor
    static async create(distributorData) {
        const {
            id,
            name,
            wallet_address,
            contact_email,
            contact_phone,
            address,
            blockchain_registration_hash
        } = distributorData;

        const sql = `INSERT INTO distributors (
            id, name, wallet_address, contact_email, contact_phone, address, blockchain_registration_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const result = await db.run(sql, [
            id, name, wallet_address, contact_email, contact_phone, address, blockchain_registration_hash
        ]);

        return await Distributor.findById(id);
    }

    // Find distributor by ID
    static async findById(id) {
        const sql = `SELECT * FROM distributors WHERE id = ? AND is_active = 1`;
        const rows = await db.query(sql, [id]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Distributor(rows[0]);
    }

    // Find distributor by wallet address
    static async findByWalletAddress(walletAddress) {
        const sql = `SELECT * FROM distributors WHERE wallet_address = ? AND is_active = 1`;
        const rows = await db.query(sql, [walletAddress]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Distributor(rows[0]);
    }

    // Get all active distributors
    static async findAll() {
        const sql = `SELECT * FROM distributors WHERE is_active = 1 ORDER BY name`;
        const rows = await db.query(sql);
        
        return rows.map(row => new Distributor(row));
    }

    // Update distributor
    async update(updateData) {
        const fields = [];
        const values = [];
        
        const allowedFields = ['name', 'wallet_address', 'contact_email', 'contact_phone', 'address'];
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }
        
        if (fields.length === 0) {
            return this;
        }
        
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(this.id);
        
        const sql = `UPDATE distributors SET ${fields.join(', ')} WHERE id = ?`;
        await db.run(sql, values);
        
        return await Distributor.findById(this.id);
    }

    // Deactivate distributor
    async deactivate() {
        const sql = `UPDATE distributors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await db.run(sql, [this.id]);
        
        // Also deactivate all relationships
        const relationshipSql = `UPDATE manufacturer_distributor_relationships 
                                SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                                WHERE distributor_id = ?`;
        await db.run(relationshipSql, [this.id]);
        
        return true;
    }

    // Get distributor's manufacturer relationships
    async getManufacturerRelationships() {
        const sql = `SELECT mdr.*, m.name as manufacturer_name, t.name as territory_name, t.type as territory_type
                     FROM manufacturer_distributor_relationships mdr
                     JOIN manufacturers m ON mdr.manufacturer_id = m.id
                     JOIN territories t ON mdr.territory_id = t.id
                     WHERE mdr.distributor_id = ? AND mdr.is_active = 1
                     ORDER BY mdr.created_at DESC`;
        
        const rows = await db.query(sql, [this.id]);
        return rows;
    }

    // Check if distributor has relationship with manufacturer in territory
    async hasRelationshipWith(manufacturerId, territoryId = null) {
        let sql = `SELECT COUNT(*) as count FROM manufacturer_distributor_relationships 
                   WHERE distributor_id = ? AND manufacturer_id = ? AND is_active = 1`;
        const params = [this.id, manufacturerId];
        
        if (territoryId) {
            sql += ` AND territory_id = ?`;
            params.push(territoryId);
        }
        
        const rows = await db.query(sql, params);
        return rows[0].count > 0;
    }

    // JSON representation with proper boolean conversion
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            walletAddress: this.wallet_address,
            contactEmail: this.contact_email,
            contactPhone: this.contact_phone,
            address: this.address,
            blockchainRegistrationHash: this.blockchain_registration_hash,
            isActive: Boolean(this.is_active),
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    // Generate unique distributor ID
    static generateDistributorId() {
        return 'dist' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
    }
}

module.exports = Distributor;