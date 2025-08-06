const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

// Wrapper for async/await style queries
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
};

// Initialize database tables async
const initDatabase = async () => {
    try {
        // Users table
        await run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_verified BOOLEAN DEFAULT 0,
            reset_token VARCHAR(255),
            reset_token_expires DATETIME
        )`);

        // Audit logs table  
        await run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action VARCHAR(100) NOT NULL,
            metadata TEXT,
            outcome VARCHAR(50),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Manufacturers table
        await run(`CREATE TABLE IF NOT EXISTS manufacturers (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            wallet_address VARCHAR(42) UNIQUE,
            permissions TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Valves table
        await run(`CREATE TABLE IF NOT EXISTS valves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_id VARCHAR(50) UNIQUE NOT NULL,
            valve_id VARCHAR(100) UNIQUE NOT NULL,
            serial_number VARCHAR(255) UNIQUE NOT NULL,
            type VARCHAR(50) NOT NULL,
            manufacturer_id VARCHAR(50) NOT NULL,
            model VARCHAR(255) NOT NULL,
            diameter REAL NOT NULL,
            pressure REAL NOT NULL,
            temperature REAL NOT NULL,
            material VARCHAR(255) NOT NULL,
            connection_type VARCHAR(255) NOT NULL,
            flow_coefficient REAL,
            manufacture_date DATE NOT NULL,
            warranty_months INTEGER DEFAULT 12,
            certifications TEXT,
            transaction_hash VARCHAR(66),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id)
        )`);

        // Distributors table
        await run(`CREATE TABLE IF NOT EXISTS distributors (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            wallet_address VARCHAR(42) UNIQUE,
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),
            address TEXT,
            blockchain_registration_hash VARCHAR(66),
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Territories table for geographical scoping
        await run(`CREATE TABLE IF NOT EXISTS territories (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(20) NOT NULL CHECK (type IN ('global', 'region', 'territory')),
            parent_id VARCHAR(50),
            description TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES territories(id)
        )`);

        // Manufacturer-Distributor relationships table
        await run(`CREATE TABLE IF NOT EXISTS manufacturer_distributor_relationships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            manufacturer_id VARCHAR(50) NOT NULL,
            distributor_id VARCHAR(50) NOT NULL,
            territory_id VARCHAR(50) NOT NULL,
            permissions TEXT,
            contract_address VARCHAR(42),
            blockchain_assignment_hash VARCHAR(66),
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
            FOREIGN KEY (distributor_id) REFERENCES distributors(id),
            FOREIGN KEY (territory_id) REFERENCES territories(id),
            UNIQUE(manufacturer_id, distributor_id, territory_id)
        )`);

        // Valve ownership transfers table (this will be recreated later with plant support)
        await run(`CREATE TABLE IF NOT EXISTS valve_ownership_transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            valve_id INTEGER NOT NULL,
            from_owner_id VARCHAR(50) NOT NULL,
            from_owner_type VARCHAR(20) NOT NULL CHECK (from_owner_type IN ('manufacturer', 'distributor')),
            to_owner_id VARCHAR(50) NOT NULL,
            to_owner_type VARCHAR(20) NOT NULL CHECK (to_owner_type IN ('manufacturer', 'distributor')),
            transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('initial_assignment', 'transfer', 'revoke')),
            blockchain_transaction_hash VARCHAR(66),
            reason TEXT,
            is_completed BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (valve_id) REFERENCES valves(id)
        )`);

        // Add columns to valves table for ownership tracking
        await run(`ALTER TABLE valves ADD COLUMN current_owner_id VARCHAR(50)`).catch(() => {});
        await run(`ALTER TABLE valves ADD COLUMN current_owner_type VARCHAR(20) DEFAULT 'manufacturer'`).catch(() => {});

        // Update existing CHECK constraints to allow 'plant' owner type
        // First, we need to recreate the valve_ownership_transfers table with the new constraints
        await run(`CREATE TABLE IF NOT EXISTS valve_ownership_transfers_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            valve_id INTEGER NOT NULL,
            from_owner_id VARCHAR(50) NOT NULL,
            from_owner_type VARCHAR(20) NOT NULL CHECK (from_owner_type IN ('manufacturer', 'distributor', 'plant')),
            to_owner_id VARCHAR(50) NOT NULL,
            to_owner_type VARCHAR(20) NOT NULL CHECK (to_owner_type IN ('manufacturer', 'distributor', 'plant')),
            transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('initial_assignment', 'transfer', 'revoke')),
            blockchain_transaction_hash VARCHAR(66),
            reason TEXT,
            is_completed BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (valve_id) REFERENCES valves(id)
        )`).catch(() => {});

        // Copy existing data
        await run(`INSERT OR IGNORE INTO valve_ownership_transfers_new 
                   SELECT * FROM valve_ownership_transfers`).catch(() => {});

        // Drop the old table and rename the new one
        await run(`DROP TABLE IF EXISTS valve_ownership_transfers`).catch(() => {});
        await run(`ALTER TABLE valve_ownership_transfers_new RENAME TO valve_ownership_transfers`).catch(() => {});

        // Also update the valves table constraint
        await run(`CREATE TABLE IF NOT EXISTS valves_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_id VARCHAR(50) UNIQUE NOT NULL,
            valve_id VARCHAR(100) UNIQUE NOT NULL,
            serial_number VARCHAR(255) UNIQUE NOT NULL,
            type VARCHAR(50) NOT NULL,
            manufacturer_id VARCHAR(50) NOT NULL,
            model VARCHAR(255) NOT NULL,
            diameter REAL NOT NULL,
            pressure REAL NOT NULL,
            temperature REAL NOT NULL,
            material VARCHAR(255) NOT NULL,
            connection_type VARCHAR(255) NOT NULL,
            flow_coefficient REAL,
            manufacture_date DATE NOT NULL,
            warranty_months INTEGER DEFAULT 12,
            certifications TEXT,
            transaction_hash VARCHAR(66),
            current_owner_id VARCHAR(50),
            current_owner_type VARCHAR(20) DEFAULT 'manufacturer' CHECK (current_owner_type IN ('manufacturer', 'distributor', 'plant')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id)
        )`).catch(() => {});

        // Copy existing valves data
        await run(`INSERT OR IGNORE INTO valves_new 
                   SELECT * FROM valves`).catch(() => {});

        // Drop the old valves table and rename the new one
        await run(`DROP TABLE IF EXISTS valves`).catch(() => {});
        await run(`ALTER TABLE valves_new RENAME TO valves`).catch(() => {});

        // Purchase Orders table
        await run(`CREATE TABLE IF NOT EXISTS purchase_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            po_number VARCHAR(100) UNIQUE NOT NULL,
            manufacturer_id VARCHAR(50) NOT NULL,
            distributor_id VARCHAR(50) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
            items TEXT NOT NULL,
            notes TEXT,
            approved_by INTEGER,
            approved_at DATETIME,
            blockchain_transaction_hash VARCHAR(66),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
            FOREIGN KEY (distributor_id) REFERENCES distributors(id),
            FOREIGN KEY (approved_by) REFERENCES users(id)
        )`);

        // Insert sample manufacturer data if not exists
        await run(`INSERT OR IGNORE INTO manufacturers (id, name, wallet_address, permissions) VALUES 
            ('mfg001', 'Emerson Process Management', '0x742d35Cc6436C0532925a3b8D0000a5492d95a8b', 'tokenize_valves,read_inventory,manage_distributors'),
            ('mfg002', 'Kitz Corporation', '0x742d35Cc6436C0532925a3b8D0000a5492d95a8c', 'tokenize_valves,read_inventory,manage_distributors')`);

        // Insert sample territory data if not exists
        await run(`INSERT OR IGNORE INTO territories (id, name, type, description) VALUES 
            ('global', 'Global', 'global', 'Worldwide distribution rights'),
            ('na', 'North America', 'region', 'United States and Canada'),
            ('eu', 'Europe', 'region', 'European Union and surrounding countries'),
            ('asia', 'Asia Pacific', 'region', 'Asia Pacific region'),
            ('us-east', 'US East Coast', 'territory', 'Eastern United States'),
            ('us-west', 'US West Coast', 'territory', 'Western United States')`);

        // Insert sample distributor data if not exists
        await run(`INSERT OR IGNORE INTO distributors (id, name, wallet_address, contact_email) VALUES 
            ('dist001', 'Industrial Valve Solutions Inc', '0x123d35Cc6436C0532925a3b8D0000a5492d95a1', 'sales@ivs-inc.com'),
            ('dist002', 'Global Valve Distribution', '0x456d35Cc6436C0532925a3b8D0000a5492d95a2', 'info@gvd.com')`);

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
};

// Initialize database tables
initDatabase();

module.exports = {
    db: {
        query,
        run
    }
};