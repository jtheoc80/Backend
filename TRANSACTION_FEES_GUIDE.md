# Transaction Fees Framework

The ValveChain backend implements a comprehensive transaction fees framework for charging fees on blockchain transactions based on user roles. This framework provides accurate, modular, and extensible fee calculations with automatic fee collection to a designated wallet.

## Overview

The transaction fees framework consists of three main components:

1. **TransactionFeeService** - Core fee calculation logic
2. **Enhanced BlockchainService** - Integration with blockchain operations
3. **Fee Wallet Collection** - Automatic transfer of collected fees to a designated wallet

## Fee Collection Mechanism

All collected transaction fees are automatically transferred to a designated fee wallet address after successful blockchain transactions. The fee collection is transparent and does not affect the net amount received by users.

### Configuration

The fee wallet address is configured through the `FEE_WALLET_ADDRESS` environment variable:

```bash
# .env file
FEE_WALLET_ADDRESS=0xFEEWALLETADDRESS  # Replace with actual wallet address
```

### How It Works

1. **Fee Calculation**: The system calculates the appropriate fee based on user role
2. **Transaction Execution**: The main blockchain transaction is executed
3. **Fee Transfer**: If the transaction succeeds, the calculated fee is automatically transferred to the designated fee wallet
4. **Logging**: All fee transfers are logged for transparency and auditing

### Fee Transfer Example

```javascript
// Example: Registering a distributor with automatic fee collection
const result = await blockchainService.registerDistributorWithFees(
    distributorData,
    'distributor',  // User role
    0.05           // Estimated transaction value in ETH
);

console.log(result);
// Output includes fee transfer information:
// {
//   success: true,
//   transactionHash: '0x123...',
//   feeDetails: {
//     feeAmount: 0.00005,           // Fee amount (0.10% for distributors)
//     netAmount: 0.04995,           // Net amount (original - fee)
//     feeWalletAddress: '0xFEEWALLETADDRESS'
//   },
//   feeTransfer: {
//     success: true,
//     feeAmount: 0.00005,
//     feeWalletAddress: '0xFEEWALLETADDRESS',
//     transactionHash: '0x456...'  // Separate transaction for fee transfer
//   }
// }
```

## Fee Structure

All fees are calculated in **basis points (bps)** where 1 bps = 0.01% = 0.0001 as a decimal.

| Role | Fee Rate | Percentage | Description |
|------|----------|------------|-------------|
| **General Transactions** | 60 bps | 0.60% | Default fee for unspecified roles |
| **Distributors** | 10 bps | 0.10% | Distributor network transactions |
| **Repair Vendors** | 10 bps | 0.10% | Repair and maintenance operations |
| **Plants** | 40 bps | 0.40% | Plant facility transactions |
| **Admins** | 0 bps | 0.00% | Administrative operations (no fees) |

## Usage

### Basic Fee Calculation

```javascript
const transactionFeeService = require('./transactionFeeService');

// Calculate fee for a distributor making a 10 ETH transaction
const feeResult = transactionFeeService.calculateFee('distributor', 10.0);

console.log(feeResult);
// Output:
// {
//   success: true,
//   role: 'distributor',
//   transactionAmount: 10.0,
//   feeBasisPoints: 10,
//   feeRate: 0.001,
//   feeAmount: 0.01,
//   netAmount: 9.99,
//   calculation: {
//     formula: '10 ETH × 10 bps = 0.01 ETH',
//     percentage: '0.10%'
//   }
// }
```

### Blockchain Operations with Fees

```javascript
const blockchainService = require('./blockchainService');

// Register distributor with automatic fee calculation and collection
const result = await blockchainService.registerDistributorWithFees(
    distributorData,
    'admin',        // User role
    0.05           // Estimated transaction value in ETH
);

console.log(result.feeDetails);
// Output:
// {
//   originalAmount: 0.05,
//   feeAmount: 0,
//   netAmount: 0.05,
//   feeBasisPoints: 0,
//   feePercentage: '0.00%',
//   userRole: 'admin',
//   feeWalletAddress: '0xFEEWALLETADDRESS'
// }

// Approve purchase order with fee collection
const poResult = await blockchainService.approvePurchaseOrderWithFees(
    'PO-001',
    { approver: 'user123', timestamp: Date.now() },
    'plant',       // User role
    0.02          // Estimated transaction value in ETH
);

console.log(poResult.feeTransfer);
// Output:
// {
//   success: true,
//   feeAmount: 0.00008,
//   feeWalletAddress: '0xFEEWALLETADDRESS',
//   transactionHash: '0x456...'
// }
```

### Fee Estimation

```javascript
// Get fee estimate before executing transaction
const estimate = await blockchainService.getTransactionFeeEstimate(
    'plant',
    'ownership_transfer',
    5.0
);

console.log(estimate.feeDetails);
// Output:
// {
//   feeBasisPoints: 40,
//   feeRate: 0.004,
//   feeAmount: 0.02,
//   feePercentage: '0.40%',
//   netAmount: 4.98,
//   formula: '5 ETH × 40 bps = 0.02 ETH'
// }
```

## API Reference

### TransactionFeeService

#### `calculateFee(userRole, transactionAmount)`

Calculates transaction fee based on user role and transaction amount.

**Parameters:**
- `userRole` (string): User role (case-insensitive)
- `transactionAmount` (number): Transaction amount in ETH

**Returns:**
- Object with fee calculation details or error information

#### `getAllFeeTiers()`

Returns all available fee tiers with descriptions.

#### `setFeeTier(role, basisPoints)`

Add or update fee tier for a specific role.

**Parameters:**
- `role` (string): Role name
- `basisPoints` (number): Fee in basis points

### Enhanced BlockchainService Methods

#### `registerDistributorWithFees(distributorData, userRole, estimatedTransactionValue)`

Register distributor with automatic fee calculation.

#### `assignDistributorRightsWithFees(manufacturerId, distributorId, territoryId, permissions, userRole, estimatedTransactionValue)`

Assign distributor rights with fee calculation.

#### `revokeDistributorRightsWithFees(manufacturerId, distributorId, territoryId, userRole, estimatedTransactionValue)`

Revoke distributor rights with fee calculation.

#### `transferValveOwnershipWithFees(valveTokenId, fromOwnerId, toOwnerId, ownerType, userRole, estimatedTransactionValue)`

Transfer valve ownership with fee calculation.

#### `approvePurchaseOrderWithFees(poId, approvalData, userRole, estimatedTransactionValue)`

Approve purchase order with automatic fee calculation and collection.

**Parameters:**
- `poId` (string): Purchase order ID
- `approvalData` (object): Approval data containing approver and timestamp
- `userRole` (string): Role of the user approving the PO
- `estimatedTransactionValue` (number): Estimated transaction value in ETH

#### `getTransactionFeeEstimate(userRole, transactionType, estimatedValue)`

Get fee estimate for a transaction without executing it.

#### `transferFeeToWallet(feeAmount, transactionType, userRole)`

Transfer collected fee to the designated fee wallet.

**Parameters:**
- `feeAmount` (number): Amount of fee to transfer in ETH
- `transactionType` (string): Type of transaction for logging
- `userRole` (string): User role for context

**Returns:**
- Object with transfer result including transaction hash and wallet address

## Fee Wallet Configuration

### Environment Configuration

Configure the designated fee wallet in your `.env` file:

```bash
# Fee wallet configuration
FEE_WALLET_ADDRESS=0xYourFeeWalletAddress  # Replace with actual wallet address
```

### Automatic Fee Collection

All blockchain transactions that collect fees automatically transfer the fee portion to the designated wallet:

1. **No User Impact**: Users only pay the net amount; fee collection is transparent
2. **Separate Transactions**: Fee transfers are separate blockchain transactions
3. **Audit Trail**: All fee transfers are logged with transaction hashes
4. **Error Handling**: Failed fee transfers don't affect the main transaction

### Fee Collection Flow

```
User Transaction (e.g., 0.05 ETH with 0.10% fee for distributor)
├── Calculate Fee: 0.00005 ETH
├── Execute Main Transaction: Success
├── Transfer Fee to Wallet: 0.00005 ETH → 0xFEEWALLETADDRESS  
└── Net User Payment: 0.04995 ETH
```

### Monitoring Fee Collection

Monitor fee collection through transaction logs:

```javascript
// Example of fee transfer logging
console.log(`Fee transfer successful: ${feeAmount} ETH to ${feeWalletAddress}`);
// Output: Fee transfer successful: 0.00005 ETH to 0xFEEWALLETADDRESS
```

## Role Mapping

The system supports flexible role naming with automatic mapping:

```javascript
// These all map to the same fee tier
'distributor' -> 10 bps
'dist' -> 10 bps
'distribution' -> 10 bps

'repair_vendor' -> 10 bps
'repair' -> 10 bps
'repairvendor' -> 10 bps
'repair-vendor' -> 10 bps
```

## Extensibility

### Adding New Fee Tiers

```javascript
// Add custom role with specific fee
transactionFeeService.setFeeTier('premium_customer', 25); // 25 bps = 0.25%

// Verify the new tier
const result = transactionFeeService.calculateFee('premium_customer', 1.0);
console.log(result.feeBasisPoints); // 25
```

### Custom Integration

The framework is designed to integrate with any transaction logic:

```javascript
async function customTransactionWithFees(userRole, amount, customLogic) {
    // Calculate fees
    const feeCalculation = transactionFeeService.calculateFee(userRole, amount);
    
    if (!feeCalculation.success) {
        throw new Error('Fee calculation failed: ' + feeCalculation.error);
    }
    
    // Execute custom logic with fee information
    const result = await customLogic(feeCalculation);
    
    // Add fee details to result
    result.feeDetails = feeCalculation;
    
    return result;
}
```

## Error Handling

The framework includes comprehensive error handling:

```javascript
const result = transactionFeeService.calculateFee('', -1);
console.log(result);
// Output:
// {
//   success: false,
//   error: 'User role must be a valid string',
//   role: '',
//   transactionAmount: -1
// }
```

## Testing

The framework includes comprehensive test suites:

```bash
# Run transaction fee service tests
npm run test -- __tests__/transactionFeeService.test.js

# Run blockchain service integration tests
npm run test -- __tests__/blockchainService.test.js
```

## Integration Examples

### Purchase Order Approval with Fee Collection

```javascript
// In your PO controller
const poResult = await createPurchaseOrder(poData);
if (poResult.success && poData.blockchainEnabled) {
    const blockchainResult = await blockchainService.approvePurchaseOrderWithFees(
        poData.id,
        { 
            approver: req.user.id, 
            timestamp: Date.now() 
        },
        req.user.role,
        poData.total_amount * 0.01 // 1% of PO value as transaction estimate
    );
    
    if (blockchainResult.success) {
        poResult.blockchainHash = blockchainResult.transactionHash;
        poResult.transactionFees = blockchainResult.feeDetails;
        poResult.feeCollection = blockchainResult.feeTransfer;
        
        // Log fee collection for audit
        console.log(`Fee collected: ${blockchainResult.feeDetails.feeAmount} ETH to ${blockchainResult.feeDetails.feeWalletAddress}`);
    }
}
```

### Distributor Registration with Fee Collection

```javascript
// During distributor registration, fees are automatically collected
const registrationResult = await blockchainService.registerDistributorWithFees(
    distributorData,
    req.user.role,
    0.02 // Standard registration transaction value
);

if (registrationResult.success) {
    // Main transaction succeeded
    console.log('Distributor registered:', registrationResult.transactionHash);
    
    // Fee collection details
    if (registrationResult.feeTransfer && registrationResult.feeTransfer.success) {
        console.log('Fee collected:', registrationResult.feeTransfer.feeAmount, 'ETH');
        console.log('Fee wallet:', registrationResult.feeTransfer.feeWalletAddress);
        console.log('Fee transfer hash:', registrationResult.feeTransfer.transactionHash);
    }
}
```

### User Registration with Role-based Fees

```javascript
// During user registration, show estimated fees
const feeEstimate = await blockchainService.getTransactionFeeEstimate(
    userData.role,
    'registration',
    0.01 // Standard registration transaction value
);

if (feeEstimate.success) {
    userData.estimatedFees = feeEstimate.feeDetails;
}
```

## Backward Compatibility

The framework maintains full backward compatibility with existing blockchain methods. Original methods continue to work without fees, while new `*WithFees` methods provide enhanced functionality.

## Configuration

Fee tiers can be configured at runtime:

```javascript
// Environment-based configuration
if (process.env.NODE_ENV === 'production') {
    transactionFeeService.setFeeTier('distributor', 10);
    transactionFeeService.setFeeTier('plant', 40);
} else {
    // Reduced fees for development
    transactionFeeService.setFeeTier('distributor', 1);
    transactionFeeService.setFeeTier('plant', 4);
}
```

## Performance Considerations

- Fee calculations are performed in-memory with O(1) complexity
- No database queries required for standard fee calculations
- Minimal overhead added to blockchain operations
- Thread-safe for concurrent operations

## Future Enhancements

The framework is designed to support:

- Dynamic fee adjustments based on network conditions
- Time-based fee schedules
- Volume-based discounts
- Integration with external fee oracles
- Multi-currency fee calculations

## Support

For questions or issues related to the transaction fees framework, please refer to the test files for usage examples or contact the development team.