const { db } = require('./database');

class Territory {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type; // 'global', 'region', 'territory'
        this.parent_id = data.parent_id;
        this.description = data.description;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
    }

    // Find territory by ID
    static async findById(id) {
        const sql = `SELECT * FROM territories WHERE id = ? AND is_active = 1`;
        const rows = await db.query(sql, [id]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Territory(rows[0]);
    }

    // Get all active territories
    static async findAll() {
        const sql = `SELECT * FROM territories WHERE is_active = 1 ORDER BY type, name`;
        const rows = await db.query(sql);
        
        return rows.map(row => new Territory(row));
    }

    // Get territories by type
    static async findByType(type) {
        const sql = `SELECT * FROM territories WHERE type = ? AND is_active = 1 ORDER BY name`;
        const rows = await db.query(sql, [type]);
        
        return rows.map(row => new Territory(row));
    }

    // Get child territories
    async getChildTerritories() {
        const sql = `SELECT * FROM territories WHERE parent_id = ? AND is_active = 1 ORDER BY name`;
        const rows = await db.query(sql, [this.id]);
        
        return rows.map(row => new Territory(row));
    }

    // Get parent territory
    async getParentTerritory() {
        if (!this.parent_id) {
            return null;
        }
        
        return await Territory.findById(this.parent_id);
    }

    // Check if territory is global
    isGlobal() {
        return this.type === 'global';
    }

    // Check if territory is region
    isRegion() {
        return this.type === 'region';
    }

    // Check if territory is specific territory
    isTerritory() {
        return this.type === 'territory';
    }

    // Get all territories in hierarchy (parent and children)
    async getTerritoryHierarchy() {
        const hierarchy = {
            current: this,
            parent: null,
            children: []
        };

        if (this.parent_id) {
            hierarchy.parent = await this.getParentTerritory();
        }

        hierarchy.children = await this.getChildTerritories();

        return hierarchy;
    }

    // JSON representation
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            parentId: this.parent_id,
            description: this.description,
            isActive: this.is_active,
            created_at: this.created_at
        };
    }

    // JSON representation with hierarchy
    async toJSONWithHierarchy() {
        const basic = this.toJSON();
        const hierarchy = await this.getTerritoryHierarchy();
        
        return {
            ...basic,
            parent: hierarchy.parent ? hierarchy.parent.toJSON() : null,
            children: hierarchy.children.map(child => child.toJSON())
        };
    }
}

module.exports = Territory;