const { db } = require('./database');
const crypto = require('crypto');

class Valve {
    constructor(data) {
        this.id = data.id;
        this.token_id = data.token_id;
        this.valve_id = data.valve_id;
        this.serial_number = data.serial_number;
        this.type = data.type;
        this.manufacturer_id = data.manufacturer_id;
        this.model = data.model;
        this.diameter = data.diameter;
        this.pressure = data.pressure;
        this.temperature = data.temperature;
        this.material = data.material;
        this.connection_type = data.connection_type;
        this.flow_coefficient = data.flow_coefficient;
        this.manufacture_date = data.manufacture_date;
        this.warranty_months = data.warranty_months;
        this.certifications = data.certifications ? data.certifications.split(',').map(c => c.trim()).filter(Boolean) : [];
        this.transaction_hash = data.transaction_hash;
        this.current_owner_id = data.current_owner_id || data.manufacturer_id;
        this.current_owner_type = data.current_owner_type || 'manufacturer';
        this.is_burned = data.is_burned || 0;
        this.burn_reason = data.burn_reason;
        this.burned_at = data.burned_at;
        this.burned_by = data.burned_by;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new valve
    static async create(valveData) {
        const {
            token_id,
            valve_id,
            serial_number,
            type,
            manufacturer_id,
            model,
            diameter,
            pressure,
            temperature,
            material,
            connection_type,
            flow_coefficient,
            manufacture_date,
            warranty_months,
            certifications,
            transaction_hash
        } = valveData;

        const certificationsStr = Array.isArray(certifications) ? certifications.join(',') : certifications || '';

        const sql = `INSERT INTO valves (
            token_id, valve_id, serial_number, type, manufacturer_id, model,
            diameter, pressure, temperature, material, connection_type,
            flow_coefficient, manufacture_date, warranty_months, certifications,
            transaction_hash, current_owner_id, current_owner_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const result = await db.run(sql, [
            token_id, valve_id, serial_number, type, manufacturer_id, model,
            diameter, pressure, temperature, material, connection_type,
            flow_coefficient, manufacture_date, warranty_months, certificationsStr,
            transaction_hash, manufacturer_id, 'manufacturer'
        ]);

        return await Valve.findById(result.lastID);
    }

    // Find valve by ID
    static async findById(id) {
        const sql = `SELECT * FROM valves WHERE id = ?`;
        const rows = await db.query(sql, [id]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Valve(rows[0]);
    }

    // Find valve by token ID
    static async findByTokenId(tokenId) {
        const sql = `SELECT * FROM valves WHERE token_id = ?`;
        const rows = await db.query(sql, [tokenId]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Valve(rows[0]);
    }

    // Find valve by serial number
    static async findBySerialNumber(serialNumber) {
        const sql = `SELECT * FROM valves WHERE serial_number = ?`;
        const rows = await db.query(sql, [serialNumber]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return new Valve(rows[0]);
    }

    // Get valves by current owner
    static async findByOwner(ownerId, ownerType, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const sql = `SELECT * FROM valves WHERE current_owner_id = ? AND current_owner_type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const rows = await db.query(sql, [ownerId, ownerType, limit, offset]);
        
        return rows.map(row => new Valve(row));
    }

    // Transfer valve ownership
    async transferOwnership(toOwnerId, toOwnerType, transferType = 'transfer', reason = null) {
        const { db: database } = require('./database');
        
        // Start transaction
        await database.run('BEGIN TRANSACTION');
        
        try {
            // Record the transfer
            const transferSql = `INSERT INTO valve_ownership_transfers (
                valve_id, from_owner_id, from_owner_type, to_owner_id, to_owner_type,
                transfer_type, blockchain_transaction_hash, reason, is_completed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`;
            
            const transactionHash = Valve.generateTransactionHash();
            
            await database.run(transferSql, [
                this.id, this.current_owner_id, this.current_owner_type,
                toOwnerId, toOwnerType, transferType, transactionHash, reason
            ]);
            
            // Update valve ownership
            const updateSql = `UPDATE valves 
                              SET current_owner_id = ?, current_owner_type = ?, updated_at = CURRENT_TIMESTAMP 
                              WHERE id = ?`;
            
            await database.run(updateSql, [toOwnerId, toOwnerType, this.id]);
            
            // Commit transaction
            await database.run('COMMIT');
            
            return {
                success: true,
                transactionHash,
                previousOwner: { id: this.current_owner_id, type: this.current_owner_type },
                newOwner: { id: toOwnerId, type: toOwnerType }
            };
            
        } catch (error) {
            // Rollback transaction
            await database.run('ROLLBACK');
            throw error;
        }
    }

    // Get ownership transfer history
    async getOwnershipHistory() {
        const sql = `SELECT * FROM valve_ownership_transfers 
                     WHERE valve_id = ? 
                     ORDER BY created_at DESC`;
        
        const rows = await db.query(sql, [this.id]);
        return rows;
    }

    // Burn valve token (admin only)
    async burnToken(burnedBy, reason) {
        const { db: database } = require('./database');
        
        console.log('burnToken called with:', { burnedBy, reason, valveId: this.id });
        
        // Check if valve is already burned
        if (this.is_burned) {
            throw new Error('Valve token is already burned');
        }
        
        try {
            console.log('Starting burn transaction');
            await database.run('BEGIN TRANSACTION');
            
            // Update valve as burned
            const updateSql = `UPDATE valves 
                              SET is_burned = 1, burn_reason = ?, burned_at = CURRENT_TIMESTAMP, burned_by = ?, updated_at = CURRENT_TIMESTAMP 
                              WHERE id = ?`;
            
            console.log('Updating valve as burned');
            await database.run(updateSql, [reason, burnedBy, this.id]);
            
            console.log('Committing transaction');
            await database.run('COMMIT');
            
            // Update instance properties
            this.is_burned = 1;
            this.burn_reason = reason;
            this.burned_by = burnedBy;
            this.burned_at = new Date().toISOString();
            
            console.log('Burn successful');
            return {
                success: true,
                message: 'Valve token burned successfully',
                burnedAt: this.burned_at
            };
            
        } catch (error) {
            console.log('Burn error:', error);
            await database.run('ROLLBACK');
            throw error;
        }
    }

    // Restore ownership for resellable valves (admin only)
    async restoreOwnership(newOwnerId, newOwnerType, restoredBy, reason) {
        const { db: database } = require('./database');
        
        // Check if valve is burned
        if (!this.is_burned) {
            throw new Error('Cannot restore ownership: valve is not burned');
        }
        
        try {
            await database.run('BEGIN TRANSACTION');
            
            // Update valve ownership and unburn it
            const updateSql = `UPDATE valves 
                              SET current_owner_id = ?, current_owner_type = ?, 
                                  is_burned = 0, burn_reason = NULL, burned_at = NULL, burned_by = NULL,
                                  updated_at = CURRENT_TIMESTAMP 
                              WHERE id = ?`;
            
            await database.run(updateSql, [newOwnerId, newOwnerType, this.id]);
            
            await database.run('COMMIT');
            
            // Update instance properties
            this.current_owner_id = newOwnerId;
            this.current_owner_type = newOwnerType;
            this.is_burned = 0;
            this.burn_reason = null;
            this.burned_at = null;
            this.burned_by = null;
            
            return {
                success: true,
                message: 'Valve ownership restored successfully',
                newOwner: { id: newOwnerId, type: newOwnerType }
            };
            
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    }

    // Create return request
    static async createReturnRequest(returnData) {
        const { db } = require('./database');
        
        const {
            valveId,
            returnType,
            returnedById,
            returnedByType,
            returnReason,
            returnFee = 0
        } = returnData;

        // Validate return type
        const validReturnTypes = ['damaged', 'not_operable', 'custom', 'not_resellable', 'resellable'];
        if (!validReturnTypes.includes(returnType)) {
            throw new Error('Invalid return type');
        }

        const sql = `INSERT INTO valve_returns (
            valve_id, return_type, returned_by_id, returned_by_type,
            return_reason, return_fee, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`;

        const result = await db.run(sql, [
            valveId, returnType, returnedById, returnedByType,
            returnReason, returnFee
        ]);

        return await Valve.getReturnRequest(result.lastID);
    }

    // Get return request by ID
    static async getReturnRequest(returnId) {
        const { db } = require('./database');
        
        const sql = `SELECT vr.*, v.valve_id, v.serial_number, v.model, v.manufacturer_id
                     FROM valve_returns vr
                     JOIN valves v ON vr.valve_id = v.id
                     WHERE vr.id = ?`;
        
        const rows = await db.query(sql, [returnId]);
        
        if (rows.length === 0) {
            return null;
        }
        
        return rows[0];
    }

    // Get return requests with filtering
    static async getReturnRequests(filters = {}, page = 1, limit = 10) {
        const { db } = require('./database');
        
        let sql = `SELECT vr.*, v.valve_id, v.serial_number, v.model, v.manufacturer_id
                   FROM valve_returns vr
                   JOIN valves v ON vr.valve_id = v.id
                   WHERE 1=1`;
        
        const params = [];
        
        if (filters.status) {
            sql += ' AND vr.status = ?';
            params.push(filters.status);
        }
        
        if (filters.returnType) {
            sql += ' AND vr.return_type = ?';
            params.push(filters.returnType);
        }
        
        if (filters.returnedById) {
            sql += ' AND vr.returned_by_id = ?';
            params.push(filters.returnedById);
        }
        
        sql += ' ORDER BY vr.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, (page - 1) * limit);
        
        const rows = await db.query(sql, params);
        return rows;
    }

    // Approve return request (admin only)
    static async approveReturnRequest(returnId, approvedBy, approvalType, blockchainHash = null) {
        const { db: database } = require('./database');
        
        const validApprovalTypes = ['approved_for_burn', 'approved_for_restore', 'rejected'];
        if (!validApprovalTypes.includes(approvalType)) {
            throw new Error('Invalid approval type');
        }
        
        try {
            await database.run('BEGIN TRANSACTION');
            
            // Update return request
            const updateSql = `UPDATE valve_returns 
                              SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP,
                                  blockchain_transaction_hash = ?, updated_at = CURRENT_TIMESTAMP
                              WHERE id = ?`;
            
            await database.run(updateSql, [approvalType, approvedBy, blockchainHash, returnId]);
            
            await database.run('COMMIT');
            
            return await Valve.getReturnRequest(returnId);
            
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    }

    // Check if valve can be transferred to specific owner
    async canBeTransferredTo(ownerId, ownerType) {
        // Cannot transfer burned valves
        if (this.is_burned) {
            return { canTransfer: false, reason: 'Cannot transfer burned valve' };
        }
        
        // Basic validation - valve should not already be owned by the target
        if (this.current_owner_id === ownerId && this.current_owner_type === ownerType) {
            return { canTransfer: false, reason: 'Valve is already owned by this entity' };
        }
        
        // Additional business logic can be added here
        return { canTransfer: true };
    }

    // Get valves by manufacturer
    static async findByManufacturer(manufacturerId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const sql = `SELECT * FROM valves WHERE manufacturer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const rows = await db.query(sql, [manufacturerId, limit, offset]);
        
        return rows.map(row => new Valve(row));
    }

    // Get all valves with pagination
    static async findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const sql = `SELECT * FROM valves ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const rows = await db.query(sql, [limit, offset]);
        
        return rows.map(row => new Valve(row));
    }

    // Generate unique token ID
    static generateTokenId() {
        return 'VLV' + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    }

    // Generate valve ID
    static generateValveId(manufacturerName, tokenId) {
        const prefix = manufacturerName.substring(0, 3).toUpperCase();
        return `${prefix}-${tokenId}`;
    }

    // Generate mock transaction hash
    static generateTransactionHash() {
        // Use cryptographically secure random bytes for transaction hash
        return '0x' + crypto.randomBytes(32).toString('hex');
    }

    // JSON representation
    toJSON() {
        return {
            id: this.id,
            tokenId: this.token_id,
            valveId: this.valve_id,
            serialNumber: this.serial_number,
            type: this.type,
            manufacturer: this.manufacturer_id,
            model: this.model,
            specifications: {
                diameter: this.diameter,
                pressure: this.pressure,
                temperature: this.temperature,
                material: this.material,
                connectionType: this.connection_type,
                flowCoefficient: this.flow_coefficient
            },
            certifications: this.certifications,
            manufactureDate: this.manufacture_date,
            warrantyMonths: this.warranty_months,
            transactionHash: this.transaction_hash,
            currentOwner: {
                id: this.current_owner_id,
                type: this.current_owner_type
            },
            burnStatus: {
                isBurned: Boolean(this.is_burned),
                burnReason: this.burn_reason,
                burnedAt: this.burned_at,
                burnedBy: this.burned_by
            },
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
    // Validation helper
    static validateValveData(valveDetails) {
        const errors = [];

        if (!valveDetails.serialNumber || valveDetails.serialNumber.trim().length < 3) {
            errors.push('Serial number must be at least 3 characters long');
        }

        if (!valveDetails.type) {
            errors.push('Valve type is required');
        }

        if (!valveDetails.manufacturer || valveDetails.manufacturer.trim().length < 2) {
            errors.push('Manufacturer name is required');
        }

        if (!valveDetails.model || valveDetails.model.trim().length < 1) {
            errors.push('Model is required');
        }

        if (!valveDetails.specifications || valveDetails.specifications.diameter <= 0) {
            errors.push('Valve diameter must be greater than 0');
        }

        if (!valveDetails.specifications || valveDetails.specifications.pressure <= 0) {
            errors.push('Pressure rating must be greater than 0');
        }

        if (!valveDetails.specifications || valveDetails.specifications.temperature < -273) {
            errors.push('Temperature rating must be above absolute zero');
        }

        if (!valveDetails.specifications || !valveDetails.specifications.material || valveDetails.specifications.material.trim().length < 2) {
            errors.push('Material specification is required');
        }

        if (!valveDetails.specifications || !valveDetails.specifications.connectionType || valveDetails.specifications.connectionType.trim().length < 2) {
            errors.push('Connection type is required');
        }

        if (!valveDetails.manufactureDate) {
            errors.push('Manufacture date is required');
        }

        if (valveDetails.warrantyMonths < 0) {
            errors.push('Warranty months cannot be negative');
        }

        return errors;
    }
}

module.exports = Valve;