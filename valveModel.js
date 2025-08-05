const { db } = require('./database');

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
    async transferOwnership(toOwnerId, toOwnerType, transferType = 'transfer', reason = null, skipValidation = false) {
        const { db: database } = require('./database');
        
        // Validate transfer limits unless explicitly skipping validation
        if (!skipValidation) {
            const validation = await this.validateTransferLimits(toOwnerType);
            if (!validation.canTransfer) {
                throw new Error(`Transfer blocked: ${validation.reason}`);
            }
        }
        
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

    // Check if valve can be transferred to specific owner
    async canBeTransferredTo(ownerId, ownerType) {
        // Basic validation - valve should not already be owned by the target
        if (this.current_owner_id === ownerId && this.current_owner_type === ownerType) {
            return { canTransfer: false, reason: 'Valve is already owned by this entity' };
        }
        
        // Additional business logic can be added here
        return { canTransfer: true };
    }

    // Get total transfer count for this valve
    async getTotalTransferCount() {
        const sql = `SELECT COUNT(*) as count FROM valve_ownership_transfers 
                     WHERE valve_id = ? AND is_completed = 1`;
        const rows = await db.query(sql, [this.id]);
        return rows[0].count;
    }

    // Get manufacturer to distributor transfer count for this valve
    async getManufacturerTransferCount() {
        const sql = `SELECT COUNT(*) as count FROM valve_ownership_transfers 
                     WHERE valve_id = ? AND from_owner_type = 'manufacturer' 
                     AND to_owner_type = 'distributor' AND is_completed = 1`;
        const rows = await db.query(sql, [this.id]);
        return rows[0].count;
    }

    // Get distributor to distributor transfer count for this valve
    async getDistributorTransferCount() {
        const sql = `SELECT COUNT(*) as count FROM valve_ownership_transfers 
                     WHERE valve_id = ? AND from_owner_type = 'distributor' 
                     AND to_owner_type = 'distributor' AND is_completed = 1`;
        const rows = await db.query(sql, [this.id]);
        return rows[0].count;
    }

    // Check if valve is currently owned by a plant
    isOwnedByPlant() {
        return this.current_owner_type === 'plant';
    }

    // Comprehensive validation for transfer limits
    async validateTransferLimits(toOwnerType, fromOwnerType = null) {
        const currentFromType = fromOwnerType || this.current_owner_type;
        
        // Rule 1: No transfers allowed if valve is owned by plant
        if (this.isOwnedByPlant()) {
            return {
                canTransfer: false,
                reason: 'No ownership transfers are allowed once a valve is transferred to a plant',
                errorCode: 'PLANT_OWNERSHIP_FINAL'
            };
        }

        // Rule 2: Check manufacturer transfer limit (1 transfer max)
        if (currentFromType === 'manufacturer' && toOwnerType === 'distributor') {
            const manufacturerTransfers = await this.getManufacturerTransferCount();
            if (manufacturerTransfers >= 1) {
                return {
                    canTransfer: false,
                    reason: 'Manufacturer can only transfer ownership of a valve to a distributor once per valve serial number',
                    errorCode: 'MANUFACTURER_TRANSFER_LIMIT_EXCEEDED'
                };
            }
        }

        // Rule 3: Check distributor transfer limit (2 transfers max)
        if (currentFromType === 'distributor' && toOwnerType === 'distributor') {
            const distributorTransfers = await this.getDistributorTransferCount();
            if (distributorTransfers >= 2) {
                return {
                    canTransfer: false,
                    reason: 'Distributors have a combined total of two ownership transfers per valve serial number among themselves',
                    errorCode: 'DISTRIBUTOR_TRANSFER_LIMIT_EXCEEDED'
                };
            }
        }

        // Rule 4: Check global transfer cap (3 transfers max before plant)
        if (toOwnerType !== 'plant') {
            const totalTransfers = await this.getTotalTransferCount();
            if (totalTransfers >= 3) {
                return {
                    canTransfer: false,
                    reason: 'Valve has reached the maximum of three ownership transfers. It can only be transferred to a plant now',
                    errorCode: 'GLOBAL_TRANSFER_LIMIT_EXCEEDED'
                };
            }
        }

        return { canTransfer: true };
    }

    // Log transfer attempt for audit purposes
    async logTransferAttempt(toOwnerId, toOwnerType, success, reason = null, errorCode = null) {
        const { db: database } = require('./database');
        
        try {
            const logSql = `INSERT INTO valve_ownership_transfers (
                valve_id, from_owner_id, from_owner_type, to_owner_id, to_owner_type,
                transfer_type, reason, is_completed, blockchain_transaction_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            const auditReason = success ? reason : `BLOCKED: ${reason} (${errorCode || 'VALIDATION_FAILED'})`;
            const transactionHash = success ? Valve.generateTransactionHash() : null;
            
            await database.run(logSql, [
                this.id, this.current_owner_id, this.current_owner_type,
                toOwnerId, toOwnerType, 'transfer', auditReason, success ? 1 : 0, transactionHash
            ]);
            
        } catch (error) {
            console.error('Error logging transfer attempt:', error);
            // Don't throw - audit logging shouldn't break the main flow
        }
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
        return '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
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