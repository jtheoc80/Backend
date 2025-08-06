# Database Schema Documentation

## Overview

This document describes the ValveChain database schema designed for cross-database compatibility and scalability. The schema has been optimized to work across SQLite, PostgreSQL, MySQL, and other RDBMS platforms.

## Cross-Database Compatibility Standards

### 1. Primary and Foreign Key Types
- **Standard**: All primary and foreign keys use `VARCHAR(50)` UUIDs for consistency
- **Rationale**: UUIDs provide better scalability, avoid auto-increment conflicts in distributed systems, and are consistent across all database systems
- **Migration**: Existing INTEGER PRIMARY KEY AUTOINCREMENT converted to VARCHAR(50) UUIDs

### 2. Boolean Handling
- **Standard**: All boolean fields use `INTEGER` with values 0 (false) or 1 (true)
- **Rationale**: BOOLEAN type support varies across databases; INTEGER(0/1) is universally supported
- **Implementation**: `DEFAULT 0` for false, `DEFAULT 1` for true

### 3. JSON/TEXT Columns
- **Current State**: Several columns store JSON data in TEXT fields
- **Documentation**: All JSON-in-TEXT columns are documented below
- **Future**: Consider normalization for frequently queried JSON fields

### 4. Indexing Strategy
- **Standard**: Explicit indexes on all foreign keys and frequently queried columns
- **Implementation**: Named indexes with consistent naming convention

### 5. Foreign Key Constraints
- **Standard**: All foreign keys enforced with appropriate CASCADE rules
- **Implementation**: 
  - `ON DELETE CASCADE` for dependent records
  - `ON DELETE SET NULL` for optional references
  - `ON UPDATE CASCADE` for all references

## Table Definitions

### users
```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_verified INTEGER DEFAULT 0,
    reset_token VARCHAR(255),
    reset_token_expires DATETIME
);
```

**Indexes:**
- `idx_users_email` on email
- `idx_users_username` on username
- `idx_users_role` on role

### manufacturers
```sql
CREATE TABLE manufacturers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42) UNIQUE,
    permissions TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**JSON Fields:**
- `permissions`: Comma-separated list of permissions (e.g., "tokenize_valves,read_inventory,manage_distributors")

**Indexes:**
- `idx_manufacturers_wallet_address` on wallet_address
- `idx_manufacturers_is_active` on is_active

### distributors
```sql
CREATE TABLE distributors (
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
);
```

**Indexes:**
- `idx_distributors_wallet_address` on wallet_address
- `idx_distributors_is_active` on is_active

### territories
```sql
CREATE TABLE territories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('global', 'region', 'territory')),
    parent_id VARCHAR(50),
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES territories(id) ON DELETE SET NULL ON UPDATE CASCADE
);
```

**Indexes:**
- `idx_territories_type` on type
- `idx_territories_parent_id` on parent_id
- `idx_territories_is_active` on is_active

### valves
```sql
CREATE TABLE valves (
    id VARCHAR(50) PRIMARY KEY,
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
);
```

**JSON Fields:**
- `certifications`: Comma-separated list of certifications (e.g., "API 6D,ISO 14313")

**Indexes:**
- `idx_valves_token_id` on token_id
- `idx_valves_valve_id` on valve_id
- `idx_valves_serial_number` on serial_number
- `idx_valves_manufacturer_id` on manufacturer_id
- `idx_valves_current_owner` on (current_owner_id, current_owner_type)
- `idx_valves_type` on type

### manufacturer_distributor_relationships
```sql
CREATE TABLE manufacturer_distributor_relationships (
    id VARCHAR(50) PRIMARY KEY,
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
);
```

**JSON Fields:**
- `permissions`: JSON array of permissions (e.g., ["receive_valve_ownership", "manage_valves"])

**Indexes:**
- `idx_mdr_manufacturer` on manufacturer_id
- `idx_mdr_distributor` on distributor_id
- `idx_mdr_territory` on territory_id
- `idx_mdr_is_active` on is_active

### purchase_orders
```sql
CREATE TABLE purchase_orders (
    id VARCHAR(50) PRIMARY KEY,
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
);
```

**JSON Fields:**
- `items`: JSON array of purchase order items with structure:
  ```json
  [
    {
      "valve_id": "valve-001",
      "quantity": 2,
      "unit_price": 500.25,
      "description": "Ball Valve 1/2 inch"
    }
  ]
  ```

**Indexes:**
- `idx_po_po_number` on po_number
- `idx_po_manufacturer` on manufacturer_id
- `idx_po_distributor` on distributor_id
- `idx_po_status` on status
- `idx_po_approved_by` on approved_by

### valve_ownership_transfers
```sql
CREATE TABLE valve_ownership_transfers (
    id VARCHAR(50) PRIMARY KEY,
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
);
```

**Indexes:**
- `idx_vot_valve_id` on valve_id
- `idx_vot_from_owner` on (from_owner_id, from_owner_type)
- `idx_vot_to_owner` on (to_owner_id, to_owner_type)
- `idx_vot_is_completed` on is_completed

### audit_logs
```sql
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    metadata TEXT,
    outcome VARCHAR(50),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
```

**JSON Fields:**
- `metadata`: JSON object with action-specific metadata

**Indexes:**
- `idx_audit_user_id` on user_id
- `idx_audit_action` on action
- `idx_audit_timestamp` on timestamp
- `idx_audit_outcome` on outcome

## Migration Guidelines

### UUID Generation
- Use `crypto.randomUUID()` in Node.js for new records
- Maintain a mapping table during migration for existing references

### Boolean Migration
- Convert `BOOLEAN DEFAULT 0` to `INTEGER DEFAULT 0`
- Convert `BOOLEAN DEFAULT 1` to `INTEGER DEFAULT 1`
- Update all application code to handle 0/1 values

### Index Creation
- Create all indexes after schema migration
- Use consistent naming: `idx_{table}_{column(s)}`
- Monitor query performance and add additional indexes as needed

## Future Considerations

### JSON Column Normalization
Consider normalizing these JSON columns in future versions:
1. `purchase_orders.items` → separate `purchase_order_items` table
2. `manufacturers.permissions` → separate `manufacturer_permissions` table
3. `manufacturer_distributor_relationships.permissions` → separate permissions table

### Additional Indexes
Monitor query patterns and add indexes for:
- Composite indexes on frequently filtered combinations
- Partial indexes for specific query patterns
- Full-text search indexes for description fields

## Database-Specific Notes

### SQLite
- Foreign key constraints must be enabled: `PRAGMA foreign_keys = ON;`
- UUID generation requires external library or Node.js crypto module

### PostgreSQL
- Use `gen_random_uuid()` for UUID generation
- Consider UUID data type instead of VARCHAR(50)
- Enable query plan caching

### MySQL
- Use `UUID()` function for UUID generation
- Set `sql_mode` to include foreign key checks
- Consider utf8mb4 character set

### Migration Script Usage
Run migrations with proper error handling and rollback capabilities:
```javascript
const runMigration = async () => {
  const transaction = await db.beginTransaction();
  try {
    await migration.run();
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```