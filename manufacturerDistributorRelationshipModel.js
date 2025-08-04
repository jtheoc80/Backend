const { db } = require('./database');

class ManufacturerDistributorRelationship {
    constructor(data) {
        this.id = data.id;
        this.manufacturer_id = data.manufacturer_id;
        this.distributor_id = data.distributor_id;
        this.territory_id = data.territory_id;
        this.permissions = data.permissions ? data.permissions.split(',').map(p => p.trim()).filter(Boolean) : [];
        this.contract_address = data.contract_address;
        this.blockchain_assignment_hash = data.blockchain_assignment_hash;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new relationship
    static async create(relationshipData) {
        const {
            manufacturer_id,
            distributor_id,
            territory_id,
            permissions,
            contract_address,
            blockchain_assignment_hash
        } = relationshipData;

        const permissionsStr = Array.isArray(permissions) ? permissions.join(',') : permissions || '';

        const sql = `INSERT INTO manufacturer_distributor_relationships (
            manufacturer_id, distributor_id, territory_id, permissions, contract_address, blockchain_assignment_hash
        ) VALUES (?, ?, ?, ?, ?, ?)`;

        const result = await db.run(sql, [
            manufacturer_id, distributor_id, territory_id, permissionsStr, contract_address, blockchain_assignment_hash
        ]);

        return await ManufacturerDistributorRelationship.findById(result.lastID);
    }

    // Find relationship by ID
    static async findById(id) {
        const sql = `SELECT * FROM manufacturer_distributor_relationships WHERE id = ?`;
        const rows = await db.query(sql, [id]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new ManufacturerDistributorRelationship(rows[0]);
    }

    // Find active relationship between manufacturer and distributor in territory
    static async findRelationship(manufacturerId, distributorId, territoryId) {
        const sql = `SELECT * FROM manufacturer_distributor_relationships 
                     WHERE manufacturer_id = ? AND distributor_id = ? AND territory_id = ? AND is_active = 1`;
        const rows = await db.query(sql, [manufacturerId, distributorId, territoryId]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new ManufacturerDistributorRelationship(rows[0]);
    }

    // Get all relationships for a manufacturer
    static async findByManufacturer(manufacturerId) {
        const sql = `SELECT mdr.*, d.name as distributor_name, t.name as territory_name, t.type as territory_type
                     FROM manufacturer_distributor_relationships mdr
                     JOIN distributors d ON mdr.distributor_id = d.id
                     JOIN territories t ON mdr.territory_id = t.id
                     WHERE mdr.manufacturer_id = ? AND mdr.is_active = 1
                     ORDER BY mdr.created_at DESC`;
        
        const rows = await db.query(sql, [manufacturerId]);
        return rows.map(row => {
            const relationship = new ManufacturerDistributorRelationship(row);
            relationship.distributor_name = row.distributor_name;
            relationship.territory_name = row.territory_name;
            relationship.territory_type = row.territory_type;
            return relationship;
        });
    }

    // Get all relationships for a distributor
    static async findByDistributor(distributorId) {
        const sql = `SELECT mdr.*, m.name as manufacturer_name, t.name as territory_name, t.type as territory_type
                     FROM manufacturer_distributor_relationships mdr
                     JOIN manufacturers m ON mdr.manufacturer_id = m.id
                     JOIN territories t ON mdr.territory_id = t.id
                     WHERE mdr.distributor_id = ? AND mdr.is_active = 1
                     ORDER BY mdr.created_at DESC`;
        
        const rows = await db.query(sql, [distributorId]);
        return rows.map(row => {
            const relationship = new ManufacturerDistributorRelationship(row);
            relationship.manufacturer_name = row.manufacturer_name;
            relationship.territory_name = row.territory_name;
            relationship.territory_type = row.territory_type;
            return relationship;
        });
    }

    // Get all relationships for a territory
    static async findByTerritory(territoryId) {
        const sql = `SELECT mdr.*, m.name as manufacturer_name, d.name as distributor_name
                     FROM manufacturer_distributor_relationships mdr
                     JOIN manufacturers m ON mdr.manufacturer_id = m.id
                     JOIN distributors d ON mdr.distributor_id = d.id
                     WHERE mdr.territory_id = ? AND mdr.is_active = 1
                     ORDER BY mdr.created_at DESC`;
        
        const rows = await db.query(sql, [territoryId]);
        return rows.map(row => {
            const relationship = new ManufacturerDistributorRelationship(row);
            relationship.manufacturer_name = row.manufacturer_name;
            relationship.distributor_name = row.distributor_name;
            return relationship;
        });
    }

    // Update relationship permissions
    async updatePermissions(permissions) {
        const permissionsStr = Array.isArray(permissions) ? permissions.join(',') : permissions;
        
        const sql = `UPDATE manufacturer_distributor_relationships 
                     SET permissions = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        
        await db.run(sql, [permissionsStr, this.id]);
        return await ManufacturerDistributorRelationship.findById(this.id);
    }

    // Update blockchain contract address
    async updateContractAddress(contractAddress, blockchainHash = null) {
        const sql = `UPDATE manufacturer_distributor_relationships 
                     SET contract_address = ?, blockchain_assignment_hash = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        
        await db.run(sql, [contractAddress, blockchainHash, this.id]);
        return await ManufacturerDistributorRelationship.findById(this.id);
    }

    // Deactivate relationship (revoke rights)
    async revoke() {
        const sql = `UPDATE manufacturer_distributor_relationships 
                     SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        
        await db.run(sql, [this.id]);
        return true;
    }

    // Check if relationship has specific permission
    hasPermission(permission) {
        return this.permissions.includes(permission);
    }

    // Check if distributor can receive valve ownership transfers
    canReceiveValveOwnership() {
        return this.hasPermission('receive_valve_ownership');
    }

    // Check if distributor can manage valves
    canManageValves() {
        return this.hasPermission('manage_valves');
    }

    // JSON representation
    toJSON() {
        return {
            id: this.id,
            manufacturerId: this.manufacturer_id,
            distributorId: this.distributor_id,
            territoryId: this.territory_id,
            permissions: this.permissions,
            contractAddress: this.contract_address,
            blockchainAssignmentHash: this.blockchain_assignment_hash,
            isActive: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    // Enhanced JSON with related entity names
    toJSONWithDetails() {
        const basic = this.toJSON();
        
        // Add related entity names if they exist (from joined queries)
        if (this.manufacturer_name) basic.manufacturerName = this.manufacturer_name;
        if (this.distributor_name) basic.distributorName = this.distributor_name;
        if (this.territory_name) basic.territoryName = this.territory_name;
        if (this.territory_type) basic.territoryType = this.territory_type;
        
        return basic;
    }
}

module.exports = ManufacturerDistributorRelationship;