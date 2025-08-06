# Database Migration and Upgrade Guide

## Overview

This guide provides patterns and best practices for database migrations in the ValveChain backend, ensuring compatibility across SQLite, PostgreSQL, MySQL, and other RDBMS platforms.

## Migration Principles

### 1. Fail Fast, Fail Loud
- Never use silent `.catch(() => {})` blocks that hide migration errors
- Always throw errors that prevent the application from starting with a broken schema
- Use transaction-based migrations for atomic operations

### 2. Backward Compatibility
- Maintain existing functionality during migrations
- Use feature flags or phased rollouts for breaking changes
- Provide clear migration paths for data transformation

### 3. Cross-Database Compatibility
- Test migrations on all supported database platforms
- Use portable SQL syntax and avoid database-specific features
- Document any platform-specific considerations

## Migration Pattern Implementation

### Current Migration Function Pattern

```javascript
const runMigration = async (migrationName, migrationFunc) => {
    console.log(`Running migration: ${migrationName}`);
    try {
        await migrationFunc();
        console.log(`✓ Migration ${migrationName} completed successfully`);
    } catch (error) {
        console.error(`✗ Migration ${migrationName} failed:`, error);
        throw error;
    }
};
```

### Usage in Database Initialization

```javascript
await runMigration('create_users_table', async () => {
    await run(`CREATE TABLE IF NOT EXISTS users (...)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
});
```

## Common Migration Patterns

### 1. Creating New Tables

```javascript
await runMigration('create_new_table', async () => {
    await run(`CREATE TABLE IF NOT EXISTS new_table (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES parent_table(id) ON DELETE CASCADE ON UPDATE CASCADE
    )`);
    
    // Always create indexes immediately after table creation
    await run(`CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_new_table_is_active ON new_table(is_active)`);
});
```

### 2. Adding Columns to Existing Tables

```javascript
await runMigration('add_column_to_table', async () => {
    // Check if column exists before adding
    const columns = await query(`PRAGMA table_info(existing_table)`);
    const columnNames = columns.map(col => col.name);
    
    if (!columnNames.includes('new_column')) {
        await run(`ALTER TABLE existing_table ADD COLUMN new_column VARCHAR(50)`);
        
        // Create index if the column will be frequently queried
        await run(`CREATE INDEX IF NOT EXISTS idx_existing_table_new_column ON existing_table(new_column)`);
    }
});
```

### 3. Data Transformation Migrations

```javascript
await runMigration('transform_boolean_to_integer', async () => {
    // For boolean to integer conversion
    const tables = ['users', 'manufacturers', 'distributors'];
    
    for (const tableName of tables) {
        // Check current schema
        const columns = await query(`PRAGMA table_info(${tableName})`);
        const booleanColumns = columns.filter(col => 
            col.type.toUpperCase() === 'BOOLEAN' || 
            col.dflt_value === 'false' || 
            col.dflt_value === 'true'
        );
        
        for (const col of booleanColumns) {
            console.log(`Converting ${tableName}.${col.name} from BOOLEAN to INTEGER`);
            
            // Add new integer column
            await run(`ALTER TABLE ${tableName} ADD COLUMN ${col.name}_new INTEGER DEFAULT ${col.dflt_value === 'true' ? 1 : 0}`);
            
            // Copy data with conversion
            await run(`UPDATE ${tableName} SET ${col.name}_new = CASE 
                WHEN ${col.name} = true OR ${col.name} = 1 THEN 1 
                ELSE 0 
            END`);
            
            // In a production environment, you would:
            // 1. Drop the old column (requires table recreation in SQLite)
            // 2. Rename the new column
            // 3. Update application code
            // 4. Test thoroughly
        }
    }
});
```

### 4. Index Management

```javascript
await runMigration('add_performance_indexes', async () => {
    const indexDefinitions = [
        {
            name: 'idx_purchase_orders_created_at',
            table: 'purchase_orders',
            columns: 'created_at'
        },
        {
            name: 'idx_valves_manufacturer_type',
            table: 'valves',
            columns: 'manufacturer_id, type'
        },
        {
            name: 'idx_audit_logs_timestamp_action',
            table: 'audit_logs',
            columns: 'timestamp, action'
        }
    ];
    
    for (const index of indexDefinitions) {
        await run(`CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.columns})`);
    }
});
```

### 5. Foreign Key Constraint Updates

```javascript
await runMigration('add_foreign_key_constraints', async () => {
    // SQLite requires table recreation for FK constraint changes
    const tableRecreations = [
        {
            table: 'child_table',
            newDefinition: `CREATE TABLE child_table_new (
                id INTEGER PRIMARY KEY,
                parent_id VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                FOREIGN KEY (parent_id) REFERENCES parent_table(id) ON DELETE CASCADE ON UPDATE CASCADE
            )`
        }
    ];
    
    for (const recreation of tableRecreations) {
        // Create new table with proper constraints
        await run(recreation.newDefinition);
        
        // Copy existing data
        await run(`INSERT INTO ${recreation.table}_new SELECT * FROM ${recreation.table}`);
        
        // Drop old table and rename new one
        await run(`DROP TABLE ${recreation.table}`);
        await run(`ALTER TABLE ${recreation.table}_new RENAME TO ${recreation.table}`);
        
        // Recreate indexes
        // ... (recreate all indexes for this table)
    }
});
```

## Database-Specific Considerations

### SQLite
```javascript
// Enable foreign keys (must be done for each connection)
db.run('PRAGMA foreign_keys = ON');

// Check if column exists
const columns = await query(`PRAGMA table_info(table_name)`);

// Alter table limitations - requires table recreation for:
// - Adding foreign key constraints
// - Changing column types
// - Dropping columns
```

### PostgreSQL
```javascript
// UUID generation
// Use: gen_random_uuid() or uuid_generate_v4()

// Check if column exists
const columns = await query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1
`, ['table_name']);

// Better support for ALTER TABLE operations
await run(`ALTER TABLE table_name ADD COLUMN IF NOT EXISTS new_column VARCHAR(50)`);
```

### MySQL
```javascript
// UUID generation
// Use: UUID()

// Check if column exists
const columns = await query(`
    SELECT COLUMN_NAME 
    FROM information_schema.COLUMNS 
    WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()
`, ['table_name']);

// Set SQL mode for strict operations
await run(`SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION'`);
```

## Migration Testing Strategy

### 1. Migration Validation Tests
```javascript
// Test each migration in isolation
describe('Database Migrations', () => {
    beforeEach(async () => {
        // Create clean test database
        await createTestDatabase();
    });
    
    test('create_users_table migration', async () => {
        await runMigration('create_users_table', createUsersTable);
        
        // Verify table structure
        const columns = await query(`PRAGMA table_info(users)`);
        expect(columns.find(col => col.name === 'id')).toBeTruthy();
        expect(columns.find(col => col.name === 'is_verified').type).toBe('INTEGER');
        
        // Verify indexes were created
        const indexes = await query(`PRAGMA index_list(users)`);
        expect(indexes.find(idx => idx.name === 'idx_users_email')).toBeTruthy();
    });
});
```

### 2. End-to-End Migration Tests
```javascript
test('complete database initialization', async () => {
    await initDatabase();
    
    // Test basic operations work
    const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
    });
    
    expect(user.is_verified).toBe(0); // Verify boolean converted to integer
    
    // Test foreign key constraints
    const manufacturer = await Manufacturer.findById('mfg001');
    expect(manufacturer).toBeTruthy();
});
```

### 3. Cross-Database Compatibility Tests
```javascript
const databases = ['sqlite', 'postgresql', 'mysql'];

databases.forEach(dbType => {
    describe(`${dbType} compatibility`, () => {
        test('schema creation', async () => {
            const db = createDatabaseConnection(dbType);
            await initDatabase(db);
            
            // Test schema matches expected structure
            await validateSchemaStructure(db);
        });
    });
});
```

## Future Migration Guidelines

### 1. Planning New Migrations
- Always create a migration plan before implementing
- Consider impact on existing data and applications
- Plan rollback procedures for failed migrations
- Test on copies of production data

### 2. Migration Naming Convention
- Use descriptive names: `create_table_name_table`
- Include version or date for tracking: `v2_add_column_to_table`
- Group related changes: `normalize_json_columns_phase1`

### 3. Documentation Requirements
- Document the purpose and expected outcome
- List any breaking changes or required application updates
- Include rollback procedures
- Update this migration guide with new patterns

### 4. Performance Considerations
- Create indexes immediately after table creation
- Consider migration impact on large datasets
- Use batching for large data transformations
- Monitor migration execution time

## Rollback Procedures

### 1. Immediate Rollback (Development)
```javascript
const rollbackMigration = async (migrationName) => {
    console.log(`Rolling back migration: ${migrationName}`);
    
    try {
        // Implement specific rollback logic
        await rollbackFunction();
        console.log(`✓ Rollback ${migrationName} completed successfully`);
    } catch (error) {
        console.error(`✗ Rollback ${migrationName} failed:`, error);
        throw error;
    }
};
```

### 2. Production Rollback Strategy
- Always backup database before migrations
- Test rollback procedures in staging environment
- Have clear rollback decision criteria
- Document data loss implications

## Monitoring and Observability

### 1. Migration Logging
- Log all migration steps with timestamps
- Include performance metrics (execution time)
- Log data transformation statistics
- Alert on migration failures

### 2. Post-Migration Validation
```javascript
const validateMigration = async (migrationName) => {
    // Validate schema structure
    await validateSchemaIntegrity();
    
    // Validate data integrity
    await validateDataConsistency();
    
    // Performance checks
    await validateIndexPerformance();
    
    console.log(`✓ Migration ${migrationName} validation completed`);
};
```

This migration guide ensures that future database changes maintain the cross-database compatibility and scalability standards established in this refactor.