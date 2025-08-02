-- Initialize ValveChain database

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    metadata JSONB,
    outcome VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL UNIQUE,
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create valve records table (for blockchain integration tracking)
CREATE TABLE IF NOT EXISTS valve_records (
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(255) NOT NULL UNIQUE,
    owner_address VARCHAR(42),
    details TEXT,
    tx_hash VARCHAR(66),
    block_number BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create maintenance records table
CREATE TABLE IF NOT EXISTS maintenance_records (
    id SERIAL PRIMARY KEY,
    valve_serial_number VARCHAR(255) NOT NULL,
    description TEXT,
    report_hash VARCHAR(66),
    tx_hash VARCHAR(66),
    performed_by VARCHAR(42),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (valve_serial_number) REFERENCES valve_records(serial_number)
);

-- Create repair records table
CREATE TABLE IF NOT EXISTS repair_records (
    id SERIAL PRIMARY KEY,
    valve_serial_number VARCHAR(255) NOT NULL,
    contractor_address VARCHAR(42),
    pre_test_hash VARCHAR(66),
    repair_hash VARCHAR(66),
    post_test_hash VARCHAR(66),
    amount_eth DECIMAL(18, 8),
    tx_hash VARCHAR(66),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (valve_serial_number) REFERENCES valve_records(serial_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(contact_email);
CREATE INDEX IF NOT EXISTS idx_valve_records_serial ON valve_records(serial_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_valve_serial ON maintenance_records(valve_serial_number);
CREATE INDEX IF NOT EXISTS idx_repair_valve_serial ON repair_records(valve_serial_number);

-- Insert sample data (optional)
INSERT INTO vendors (vendor_name, contact_email) VALUES 
    ('Sample Vendor Inc.', 'contact@samplevendor.com'),
    ('Test Manufacturing Ltd.', 'info@testmanufacturing.com')
ON CONFLICT (contact_email) DO NOTHING;

COMMIT;