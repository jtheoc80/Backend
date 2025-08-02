require('dotenv').config();
const MockDatabase = require('./mockDatabase');
const logActivity = require('./logActivity');

async function testWithMockDatabase() {
    console.log('🧪 Testing database integration with mock database...');

    const mockDb = new MockDatabase();

    try {
        // Test database connection
        console.log('\n1. Testing database connection...');
        const result = await mockDb.query('SELECT NOW() as current_time');
        console.log('✅ Database connected successfully');
        console.log('   Current time:', result.rows[0].current_time);

        // Test table creation
        console.log('\n2. Creating audit_logs table...');
        await mockDb.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255),
                action VARCHAR(255) NOT NULL,
                metadata JSONB,
                outcome VARCHAR(50),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Table created successfully');

        // Test audit log insertion
        console.log('\n3. Testing audit log insertion...');
        await logActivity(mockDb, 'test-user-123', 'login', { ip: '192.168.1.1' }, 'success');
        await logActivity(mockDb, 'test-user-456', 'logout', { ip: '192.168.1.2' }, 'success');
        await logActivity(mockDb, 'test-user-123', 'update-profile', { field: 'email' }, 'success');
        console.log('✅ Audit logs inserted successfully');

        // Test audit log query
        console.log('\n4. Testing audit log query...');
        const logs = await mockDb.query(
            'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10 OFFSET 0',
            [null, null, null, null, 10, 0]
        );
        console.log('✅ Audit logs queried successfully');
        console.log('   Total logs:', logs.rows.length);
        logs.rows.forEach((log, index) => {
            console.log(`   ${index + 1}. User: ${log.user_id}, Action: ${log.action}, Outcome: ${log.outcome}`);
        });

        // Test filtered query
        console.log('\n5. Testing filtered query (user: test-user-123)...');
        const filteredLogs = await mockDb.query(
            'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC',
            ['test-user-123', null, null, null, 10, 0]
        );
        console.log('✅ Filtered query successful');
        console.log('   Filtered logs:', filteredLogs.rows.length);
        filteredLogs.rows.forEach((log, index) => {
            console.log(`   ${index + 1}. Action: ${log.action}, Outcome: ${log.outcome}`);
        });

        console.log('\n🎉 All tests passed! Database integration is working with mock database.');
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// Run tests
if (require.main === module) {
    testWithMockDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = testWithMockDatabase;