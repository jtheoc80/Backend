# Transaction Fees Framework

The ValveChain backend implements a comprehensive transaction fees framework for charging fees on blockchain transactions based on user roles. This framework provides accurate, modular, and extensible fee calculations.

## Overview

The transaction fees framework consists of two main components:

1. **TransactionFeeService** - Core fee calculation logic
2. **Enhanced BlockchainService** - Integration with blockchain operations

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

// Register distributor with automatic fee calculation
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
//   userRole: 'admin'
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

#### `getTransactionFeeEstimate(userRole, transactionType, estimatedValue)`

Get fee estimate for a transaction without executing it.

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

### Purchase Order with Fees

```javascript
// In your PO controller
const poResult = await createPurchaseOrder(poData);
if (poResult.success && poData.blockchainEnabled) {
    const blockchainResult = await blockchainService.registerPurchaseOrderWithFees(
        poData,
        req.user.role,
        poData.total_amount * 0.01 // 1% of PO value as transaction estimate
    );
    
    if (blockchainResult.success) {
        poResult.blockchainHash = blockchainResult.transactionHash;
        poResult.transactionFees = blockchainResult.feeDetails;
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