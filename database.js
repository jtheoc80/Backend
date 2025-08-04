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

        // Insert sample manufacturer data if not exists
        await run(`INSERT OR IGNORE INTO manufacturers (id, name, wallet_address, permissions) VALUES 
            ('mfg001', 'Emerson Process Management', '0x742d35Cc6436C0532925a3b8D0000a5492d95a8b', 'tokenize_valves,read_inventory'),
            ('mfg002', 'Kitz Corporation', '0x742d35Cc6436C0532925a3b8D0000a5492d95a8c', 'tokenize_valves,read_inventory')`);

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