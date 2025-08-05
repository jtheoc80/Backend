const db = require('./database');

async function initializeDatabase() {
    try {
        // Create audit_logs table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255),
                action VARCHAR(255) NOT NULL,
                metadata JSONB,
                outcome VARCHAR(50),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await db.query(createTableQuery);
        console.log('✅ audit_logs table created successfully');

        // Create indexes for better query performance
        const indexQueries = [
            'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);',
            'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);'
        ];

        for (const query of indexQueries) {
            await db.query(query);
        }
        console.log('✅ Database indexes created successfully');

        console.log('🎉 Database initialization completed');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

module.exports = initializeDatabase;

// Run initialization if this file is executed directly
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}