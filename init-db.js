require('dotenv').config();
const { initializeDatabase, testConnection, db } = require('./database');
const bcryptjs = require('bcryptjs');

const createSampleData = async () => {
    try {
        console.log('Creating sample admin user...');
        
        // Check if admin user already exists
        const existingAdmin = await db.query(
            'SELECT id FROM users WHERE username = $1',
            ['admin']
        );

        if (existingAdmin.rows.length === 0) {
            // Create admin user
            const hashedPassword = await bcryptjs.hash('admin123', 10);
            const result = await db.query(
                'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
                ['admin', 'admin@valvechain.com', hashedPassword, 'admin']
            );

            console.log('Admin user created with ID:', result.rows[0].id);

            // Create some sample audit logs
            await db.query(
                'INSERT INTO audit_logs (user_id, action, metadata, outcome) VALUES ($1, $2, $3, $4)',
                [result.rows[0].id, 'admin_created', JSON.stringify({ username: 'admin' }), 'success']
            );

            console.log('Sample audit log created');
        } else {
            console.log('Admin user already exists');
        }

        // Create a regular user for testing
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = $1',
            ['testuser']
        );

        if (existingUser.rows.length === 0) {
            const hashedPassword = await bcryptjs.hash('test123', 10);
            const result = await db.query(
                'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
                ['testuser', 'test@valvechain.com', hashedPassword, 'user']
            );

            console.log('Test user created with ID:', result.rows[0].id);

            // Create some sample audit logs for test user
            await db.query(
                'INSERT INTO audit_logs (user_id, action, metadata, outcome) VALUES ($1, $2, $3, $4)',
                [result.rows[0].id, 'user_registered', JSON.stringify({ username: 'testuser' }), 'success']
            );

            await db.query(
                'INSERT INTO audit_logs (user_id, action, metadata, outcome) VALUES ($1, $2, $3, $4)',
                [result.rows[0].id, 'login_success', JSON.stringify({ username: 'testuser' }), 'success']
            );

            console.log('Sample audit logs created for test user');
        } else {
            console.log('Test user already exists');
        }

        console.log('\n=== Sample Data Summary ===');
        if (process.env.NODE_ENV === 'development') {
            console.log('Admin credentials: username=admin, password=admin123');
            console.log('Test user credentials: username=testuser, password=test123');
        }
        
    } catch (err) {
        console.error('Error creating sample data:', err);
        throw err;
    }
};

const initDB = async () => {
    try {
        console.log('Initializing database...');
        
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            console.error('Cannot connect to database. Please ensure PostgreSQL is running and configuration is correct.');
            process.exit(1);
        }

        // Initialize schema
        await initializeDatabase();
        
        // Create sample data
        await createSampleData();
        
        console.log('\nDatabase initialization complete!');
        console.log('\nYou can now start the server with: npm start');
        
        process.exit(0);
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
};

// Run initialization
initDB();