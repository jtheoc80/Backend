const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Create database connection
const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

// Enable foreign keys for SQLite
db.run('PRAGMA foreign_keys = ON');

// UUID generation helper
const generateUUID = () => {
    return crypto.randomUUID();
};

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

// Transaction support for migrations
const beginTransaction = () => {
    return new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const commit = () => {
    return new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const rollback = () => {
    return new Promise((resolve, reject) => {
        db.run('ROLLBACK', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// Initialize database tables with proper error handling
const initDatabase = async () => {
    console.log('Initializing database with cross-database compatibility standards...');
    
    try {
        await beginTransaction();

        // Clean up any leftover migration tables
        await run(`DROP TABLE IF EXISTS valves_new`).catch(() => {});
        await run(`DROP TABLE IF EXISTS valve_ownership_transfers_new`).catch(() => {});

        // Users table - Updated for compatibility
        await run(`CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_verified INTEGER DEFAULT 0,
            reset_token VARCHAR(255),
            reset_token_expires DATETIME
        )`);

        // Create indexes for users table
        await run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);

        // Audit logs table - Updated for compatibility
        await run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(50) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            user_id VARCHAR(50),
            action VARCHAR(100) NOT NULL,
            metadata TEXT,
            outcome VARCHAR(50),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
        )`);

        // Create indexes for audit_logs table
        await run(`CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_audit_outcome ON audit_logs(outcome)`);

        // Manufacturers table - Updated for compatibility
        await run(`CREATE TABLE IF NOT EXISTS manufacturers (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            wallet_address VARCHAR(42) UNIQUE,
            permissions TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create indexes for manufacturers table
        await run(`CREATE INDEX IF NOT EXISTS idx_manufacturers_wallet_address ON manufacturers(wallet_address)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_manufacturers_is_active ON manufacturers(is_active)`);

        // Distributors table - Updated for compatibility
        await run(`CREATE TABLE IF NOT EXISTS distributors (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            wallet_address VARCHAR(42) UNIQUE,
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),
            address TEXT,
            blockchain_registration_hash VARCHAR(66),
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create indexes for distributors table
        await run(`CREATE INDEX IF NOT EXISTS idx_distributors_wallet_address ON distributors(wallet_address)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_distributors_is_active ON distributors(is_active)`);

        // Territories table - Updated for compatibility
        await run(`CREATE TABLE IF NOT EXISTS territories (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(20) NOT NULL CHECK (type IN ('global', 'region', 'territory')),
            parent_id VARCHAR(50),
            description TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES territories(id) ON DELETE SET NULL ON UPDATE CASCADE
        )`);

        // Create indexes for territories table
        await run(`CREATE INDEX IF NOT EXISTS idx_territories_type ON territories(type)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_territories_parent_id ON territories(parent_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_territories_is_active ON territories(is_active)`);

        // Valves table - Updated for compatibility
        await run(`CREATE TABLE IF NOT EXISTS valves (
            id VARCHAR(50) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
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
            FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE CASCADE ON UPDATE CASCADE
        )`);

        // Create indexes for valves table
        await run(`CREATE INDEX IF NOT EXISTS idx_valves_token_id ON valves(token_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_valves_valve_id ON valves(valve_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_valves_serial_number ON valves(serial_number)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_valves_manufacturer_id ON valves(manufacturer_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_valves_current_owner ON valves(current_owner_id, current_owner_type)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_valves_type ON valves(type)`);

        // Manufacturer-Distributor relationships table - Updated for compatibility
        await run(`CREATE TABLE IF NOT EXISTS manufacturer_distributor_relationships (
            id VARCHAR(50) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            manufacturer_id VARCHAR(50) NOT NULL,
            distributor_id VARCHAR(50) NOT NULL,
            territory_id VARCHAR(50) NOT NULL,
            permissions TEXT,
            contract_address VARCHAR(42),
            blockchain_assignment_hash VARCHAR(66),
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE CASCADE ON UPDATE CASCADE,
            UNIQUE(manufacturer_id, distributor_id, territory_id)
        )`);

        // Create indexes for manufacturer_distributor_relationships table
        await run(`CREATE INDEX IF NOT EXISTS idx_mdr_manufacturer ON manufacturer_distributor_relationships(manufacturer_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_mdr_distributor ON manufacturer_distributor_relationships(distributor_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_mdr_territory ON manufacturer_distributor_relationships(territory_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_mdr_is_active ON manufacturer_distributor_relationships(is_active)`);

        // Valve ownership transfers table - Updated for compatibility
        await run(`CREATE TABLE IF NOT EXISTS valve_ownership_transfers (
            id VARCHAR(50) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            valve_id VARCHAR(50) NOT NULL,
            from_owner_id VARCHAR(50) NOT NULL,
            from_owner_type VARCHAR(20) NOT NULL CHECK (from_owner_type IN ('manufacturer', 'distributor', 'plant')),
            to_owner_id VARCHAR(50) NOT NULL,
            to_owner_type VARCHAR(20) NOT NULL CHECK (to_owner_type IN ('manufacturer', 'distributor', 'plant')),
            transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('initial_assignment', 'transfer', 'revoke')),
            blockchain_transaction_hash VARCHAR(66),
            reason TEXT,
            is_completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (valve_id) REFERENCES valves(id) ON DELETE CASCADE ON UPDATE CASCADE
        )`);

        // Create indexes for valve_ownership_transfers table
        await run(`CREATE INDEX IF NOT EXISTS idx_vot_valve_id ON valve_ownership_transfers(valve_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_vot_from_owner ON valve_ownership_transfers(from_owner_id, from_owner_type)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_vot_to_owner ON valve_ownership_transfers(to_owner_id, to_owner_type)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_vot_is_completed ON valve_ownership_transfers(is_completed)`);

        // Purchase Orders table - Updated for compatibility
        await run(`CREATE TABLE IF NOT EXISTS purchase_orders (
            id VARCHAR(50) PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            po_number VARCHAR(100) UNIQUE NOT NULL,
            manufacturer_id VARCHAR(50) NOT NULL,
            distributor_id VARCHAR(50) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
            items TEXT NOT NULL,
            notes TEXT,
            approved_by VARCHAR(50),
            approved_at DATETIME,
            blockchain_transaction_hash VARCHAR(66),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
        )`);

        // Create indexes for purchase_orders table
        await run(`CREATE INDEX IF NOT EXISTS idx_po_po_number ON purchase_orders(po_number)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_po_manufacturer ON purchase_orders(manufacturer_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_po_distributor ON purchase_orders(distributor_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_po_approved_by ON purchase_orders(approved_by)`);

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

        await commit();
        console.log('Database tables initialized successfully with cross-database compatibility');
    } catch (error) {
        console.error('Database initialization error:', error);
        await rollback();
        throw error;
    }
};

// Initialize database tables
initDatabase().catch(console.error);

module.exports = {
    db: {
        query,
        run,
        beginTransaction,
        commit,
        rollback
    },
    generateUUID
};