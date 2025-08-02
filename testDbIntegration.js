require('dotenv').config();
const db = require('./database');
const logActivity = require('./logActivity');

async function testDatabaseIntegration() {
    console.log('🧪 Testing database integration...');

    try {
        // Test database connection
        console.log('\n1. Testing database connection...');
        const result = await db.query('SELECT NOW() as current_time');
        console.log('✅ Database connected successfully');
        console.log('   Current time:', result.rows[0].current_time);

        // Test table exists (will create if it doesn't)
        console.log('\n2. Checking if audit_logs table exists...');
        const initDb = require('./initDb');
        await initDb();

        // Test audit log insertion
        console.log('\n3. Testing audit log insertion...');
        await logActivity(db, 'test-user-123', 'test-action', { test: 'data' }, 'success');
        console.log('✅ Audit log inserted successfully');

        // Test audit log query
        console.log('\n4. Testing audit log query...');
        const logs = await db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1');
        console.log('✅ Audit log queried successfully');
        console.log('   Latest log:', logs.rows[0]);

        console.log('\n🎉 All tests passed! Database integration is working.');
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        // Close the database pool
        await db.pool.end();
    }
}

// Run tests
if (require.main === module) {
    testDatabaseIntegration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = testDatabaseIntegration;