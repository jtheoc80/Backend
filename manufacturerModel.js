const { db } = require('./database');

class Manufacturer {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.wallet_address = data.wallet_address;
        this.permissions = data.permissions ? data.permissions.split(',') : [];
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Find manufacturer by ID
    static async findById(id) {
        const sql = `SELECT * FROM manufacturers WHERE id = ? AND is_active = 1`;
        const rows = await db.query(sql, [id]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Manufacturer(rows[0]);
    }

    // Find manufacturer by wallet address
    static async findByWalletAddress(walletAddress) {
        const sql = `SELECT * FROM manufacturers WHERE wallet_address = ? AND is_active = 1`;
        const rows = await db.query(sql, [walletAddress]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Manufacturer(rows[0]);
    }

    // Get all active manufacturers
    static async findAll() {
        const sql = `SELECT * FROM manufacturers WHERE is_active = 1 ORDER BY name`;
        const rows = await db.query(sql);
        
        return rows.map(row => new Manufacturer(row));
    }

    // Validate manufacturer has permission
    hasPermission(permission) {
        return this.permissions.includes(permission);
    }

    // Check if manufacturer can tokenize valves
    canTokenizeValves() {
        return this.hasPermission('tokenize_valves');
    }

    // JSON representation
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            wallet_address: this.wallet_address,
            permissions: this.permissions,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    // Create authentication response
    toAuthResponse() {
        return {
            id: this.id,
            name: this.name,
            isAuthenticated: true,
            walletAddress: this.wallet_address,
            permissions: this.permissions
        };
    }
}

module.exports = Manufacturer;