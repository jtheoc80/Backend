# Distributor Relationship Management API

## Overview
This implementation extends the ValveChain backend with comprehensive distributor relationship management capabilities. Manufacturers can now designate distributors with whom they have existing relationships, scoped by territory, region, or globally, and transfer valve ownership rights to these designated distributors.

## New Features

### 1. Distributor Management
- **Distributor Registration**: Register new distributors on the blockchain with wallet addresses
- **Distributor CRUD Operations**: Create, read, update, and deactivate distributor accounts
- **Blockchain Integration**: All distributor registrations are recorded on-chain

### 2. Territory Management
- **Hierarchical Territories**: Support for global, regional, and territory-specific scoping
- **Pre-configured Territories**: Includes Global, North America, Europe, Asia Pacific, and specific US territories
- **Territory Hierarchy**: Parent-child relationships between territories

### 3. Manufacturer-Distributor Relationships
- **Rights Assignment**: Manufacturers can assign distributor rights scoped by territory
- **Permission Management**: Configurable permissions for valve ownership transfer and management
- **Blockchain Recording**: All relationship assignments are recorded on smart contracts
- **Rights Revocation**: Manufacturers can revoke distributor rights as needed

### 4. Valve Ownership Transfer
- **Ownership Transfer**: Transfer valve ownership from manufacturer to designated distributors
- **Relationship Validation**: Ensures distributors have active relationships before transfers
- **Blockchain Recording**: All ownership transfers are recorded on-chain
- **Transfer History**: Complete audit trail of ownership changes

## Database Schema

### New Tables

#### distributors
```sql
CREATE TABLE distributors (
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
);
```

#### territories
```sql
CREATE TABLE territories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('global', 'region', 'territory')),
    parent_id VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES territories(id)
);
```

#### manufacturer_distributor_relationships
```sql
CREATE TABLE manufacturer_distributor_relationships (
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
);
```

#### valve_ownership_transfers
```sql
CREATE TABLE valve_ownership_transfers (
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
);
```

### Modified Tables

#### valves (added columns)
- `current_owner_id`: ID of current owner (manufacturer or distributor)
- `current_owner_type`: Type of current owner ('manufacturer' or 'distributor')

#### manufacturers (updated permissions)
- Added `manage_distributors` permission for relationship management

## API Endpoints

### Distributor Management

#### Register Distributor
```http
POST /api/distributors/register
Content-Type: application/json

{
  "name": "Industrial Valve Solutions Inc",
  "walletAddress": "0x123d35Cc6436C0532925a3b8D0000a5492d95a1",
  "contactEmail": "sales@ivs-inc.com",
  "contactPhone": "+1-555-0123",
  "address": "123 Industrial Blvd, Manufacturing City, MC 12345"
}
```

#### Get All Distributors
```http
GET /api/distributors
```

#### Get Distributor by ID
```http
GET /api/distributors/{distributorId}
```

#### Update Distributor
```http
PUT /api/distributors/{distributorId}
Content-Type: application/json

{
  "name": "Updated Distributor Name",
  "contactEmail": "newemail@distributor.com"
}
```

#### Deactivate Distributor
```http
DELETE /api/distributors/{distributorId}
```

### Territory Management

#### Get All Territories
```http
GET /api/territories
```

#### Get Territories by Type
```http
GET /api/territories/type/{type}
# type: global, region, or territory
```

#### Get Territory by ID
```http
GET /api/territories/{territoryId}
```

### Relationship Management

#### Assign Distributor Rights
```http
POST /api/distributor-relationships/assign
Content-Type: application/json

{
  "manufacturerId": "mfg001",
  "distributorId": "dist001",
  "territoryId": "na",
  "permissions": ["receive_valve_ownership", "manage_valves"]
}
```

#### Revoke Distributor Rights
```http
DELETE /api/distributor-relationships/{relationshipId}/revoke
Content-Type: application/json

{
  "manufacturerId": "mfg001"
}
```

#### Get Manufacturer's Distributors
```http
GET /api/manufacturers/{manufacturerId}/distributors
```

### Valve Ownership Transfer

#### Transfer Valve Ownership
```http
POST /api/valves/transfer-ownership
Content-Type: application/json

{
  "valveTokenId": "VLV1754343743637998",
  "distributorId": "dist001",
  "manufacturerId": "mfg001",
  "reason": "Distribution agreement for North America"
}
```

## Blockchain Integration

### Smart Contract Integration
The system integrates with blockchain smart contracts for:
- **Distributor Registration**: Recording distributor wallet addresses on-chain
- **Rights Assignment**: Recording manufacturer-distributor relationships
- **Ownership Transfer**: Recording valve ownership changes
- **Rights Revocation**: Recording when distributor rights are revoked

### Mock Mode
Currently runs in mock mode for development, generating realistic transaction hashes and block numbers. Can be configured for real blockchain integration by:
1. Setting `mockMode = false` in `blockchainService.js`
2. Configuring proper RPC URL and private key in environment variables
3. Ensuring smart contract ABI is properly loaded

## Security Features

### Authorization
- **Manufacturer Permissions**: Only manufacturers with `manage_distributors` permission can assign/revoke rights
- **Ownership Validation**: Only valve owners can transfer ownership
- **Relationship Validation**: Distributors must have active relationships to receive valves

### Rate Limiting
- All distributor endpoints are rate-limited to 30 requests per 15 minutes
- Prevents abuse and ensures system stability

### Data Validation
- Comprehensive input validation for all endpoints
- Blockchain transaction verification
- Duplicate prevention for wallet addresses and relationships

## Error Handling

### Comprehensive Error Responses
```json
{
  "success": false,
  "message": "Detailed error message",
  "errors": ["Specific error details"]
}
```

### Common Error Scenarios
- **404**: Manufacturer, distributor, territory, or valve not found
- **403**: Insufficient permissions or access denied
- **409**: Duplicate relationships or existing records
- **400**: Invalid input data or missing required fields
- **500**: Blockchain integration failures or internal errors

## Testing

### Comprehensive Test Coverage
The implementation includes comprehensive testing of all endpoints:
- Distributor registration and management
- Territory management
- Relationship assignment and revocation
- Valve ownership transfer
- Error handling and validation

### Test Script
A comprehensive test script (`/tmp/test_distributor_api.sh`) demonstrates:
1. Distributor registration
2. Territory retrieval
3. Rights assignment
4. Valve creation and transfer
5. Complete workflow validation

## Implementation Notes

### Minimal Changes Approach
The implementation follows a minimal changes approach:
- **No Breaking Changes**: All existing functionality remains intact
- **Additive Only**: Only adds new functionality without modifying existing APIs
- **Database Extensions**: Extends existing database with new tables and columns
- **Backward Compatibility**: Maintains compatibility with existing clients

### Future Enhancements
- **Audit Logging**: Add comprehensive audit logging for all distributor operations
- **Advanced Permissions**: More granular permission management
- **Batch Operations**: Support for bulk distributor operations
- **Real Blockchain Integration**: Replace mock blockchain service with real contracts
- **Territory Hierarchy Management**: API endpoints for territory management
- **Distributor Analytics**: Usage statistics and performance metrics

## Usage Examples

### Complete Workflow Example

1. **Register a distributor**
2. **Assign distributor rights for a territory**
3. **Create a valve**
4. **Transfer valve ownership to distributor**
5. **Verify ownership transfer**

This workflow is demonstrated in the comprehensive test script and validates the complete distributor relationship management system.