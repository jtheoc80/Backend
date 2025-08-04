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
            transaction_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const result = await db.run(sql, [
            token_id, valve_id, serial_number, type, manufacturer_id, model,
            diameter, pressure, temperature, material, connection_type,
            flow_coefficient, manufacture_date, warranty_months, certificationsStr,
            transaction_hash
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