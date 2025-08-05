/**
 * Example integration of transaction fees with Purchase Order system
 * This demonstrates how to integrate the transaction fees framework with existing workflows
 */

const blockchainService = require('./blockchainService');
const transactionFeeService = require('./transactionFeeService');

/**
 * Enhanced PO approval with blockchain transaction fees
 * This is an example of how the existing PO system could be enhanced with fees
 */
async function approvePurchaseOrderWithFees(poId, userId, userRole, poData) {
    try {
        // Existing PO approval logic would go here...
        console.log(`Approving PO ${poId} by user ${userId} (${userRole})`);
        
        // Estimate blockchain transaction value based on PO amount
        const estimatedTxValue = Math.min(poData.total_amount * 0.001, 1.0); // 0.1% of PO value, max 1 ETH
        
        // Get fee estimate for the user before executing blockchain transaction
        const feeEstimate = await blockchainService.getTransactionFeeEstimate(
            userRole,
            'po_approval',
            estimatedTxValue
        );
        
        if (!feeEstimate.success) {
            throw new Error('Failed to calculate transaction fees: ' + feeEstimate.error);
        }
        
        // Log fee information
        console.log(`Transaction fee estimate for ${userRole}:`, {
            estimatedValue: estimatedTxValue,
            feeAmount: feeEstimate.feeDetails.feeAmount,
            feePercentage: feeEstimate.feeDetails.feePercentage,
            netAmount: feeEstimate.feeDetails.netAmount
        });
        
        // Execute blockchain transaction with fees
        const blockchainResult = await blockchainService.assignDistributorRightsWithFees(
            poData.manufacturer_id,
            poData.distributor_id,
            poData.territory || 'default',
            ['po_approved'],
            userRole,
            estimatedTxValue
        );
        
        if (!blockchainResult.success) {
            throw new Error('Blockchain transaction failed: ' + blockchainResult.error);
        }
        
        // Return enhanced result with fee information
        return {
            success: true,
            poId,
            approvedBy: userId,
            blockchainHash: blockchainResult.transactionHash,
            transactionFees: blockchainResult.feeDetails,
            message: `PO ${poId} approved successfully. Transaction fee: ${blockchainResult.feeDetails.feeAmount} ETH (${blockchainResult.feeDetails.feePercentage})`
        };
        
    } catch (error) {
        console.error('PO approval with fees failed:', error);
        return {
            success: false,
            error: error.message,
            poId
        };
    }
}

/**
 * Distributor registration with role-based fees
 */
async function registerDistributorWithRoleBasedFees(distributorData, adminUserId, adminRole) {
    try {
        console.log(`Registering distributor ${distributorData.id} by admin ${adminUserId} (${adminRole})`);
        
        // Register distributor with automatic fee calculation
        const result = await blockchainService.registerDistributorWithFees(
            distributorData,
            adminRole,
            0.02 // 0.02 ETH estimated transaction value
        );
        
        if (!result.success) {
            throw new Error('Distributor registration failed: ' + result.error);
        }
        
        // Log the fee information
        console.log(`Distributor registration fees for ${adminRole}:`, result.feeDetails);
        
        return {
            success: true,
            distributorId: distributorData.id,
            blockchainHash: result.transactionHash,
            transactionFees: result.feeDetails,
            message: `Distributor registered. Fee: ${result.feeDetails.feeAmount} ETH`
        };
        
    } catch (error) {
        console.error('Distributor registration failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Valve ownership transfer with fees
 */
async function transferValveWithFees(valveId, fromOwner, toOwner, ownerType, userRole) {
    try {
        const estimatedValue = 0.05; // 0.05 ETH for valve transfer
        
        // Get fee estimate first
        const feeEstimate = await blockchainService.getTransactionFeeEstimate(
            userRole,
            'valve_transfer',
            estimatedValue
        );
        
        console.log(`Valve transfer fee estimate for ${userRole}:`, feeEstimate.feeDetails);
        
        // Execute transfer with fees
        const result = await blockchainService.transferValveOwnershipWithFees(
            valveId,
            fromOwner,
            toOwner,
            ownerType,
            userRole,
            estimatedValue
        );
        
        return {
            success: result.success,
            valveId,
            blockchainHash: result.transactionHash,
            transactionFees: result.feeDetails,
            error: result.error
        };
        
    } catch (error) {
        console.error('Valve transfer failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Batch fee calculation for multiple operations
 */
function calculateBatchFees(operations, userRole) {
    const results = operations.map(op => {
        const feeCalc = transactionFeeService.calculateFee(userRole, op.amount);
        return {
            operation: op.type,
            amount: op.amount,
            feeCalculation: feeCalc
        };
    });
    
    const totalAmount = operations.reduce((sum, op) => sum + op.amount, 0);
    const totalFees = results.reduce((sum, result) => {
        return sum + (result.feeCalculation.success ? result.feeCalculation.feeAmount : 0);
    }, 0);
    
    return {
        operations: results,
        summary: {
            totalOperations: operations.length,
            totalAmount,
            totalFees,
            netAmount: totalAmount - totalFees,
            averageFeePercentage: totalAmount > 0 ? ((totalFees / totalAmount) * 100).toFixed(2) + '%' : '0%'
        }
    };
}

// Example usage demonstrations
async function runExamples() {
    console.log('=== Transaction Fees Framework Examples ===\n');
    
    // Example 1: Different roles, same transaction amount
    console.log('1. Role-based fee comparison (1 ETH transaction):');
    ['admin', 'distributor', 'plant', 'repair_vendor', 'user'].forEach(role => {
        const result = transactionFeeService.calculateFee(role, 1.0);
        console.log(`  ${role}: ${result.feeAmount} ETH (${result.calculation.percentage})`);
    });
    
    console.log('\n2. PO Approval with fees:');
    const poResult = await approvePurchaseOrderWithFees(
        'PO-001',
        'user123',
        'distributor',
        {
            total_amount: 5000,
            manufacturer_id: 'mfg-001',
            distributor_id: 'dist-001'
        }
    );
    console.log('  Result:', poResult.success ? 'Success' : 'Failed');
    if (poResult.success) {
        console.log('  Transaction Fees:', poResult.transactionFees);
    }
    
    console.log('\n3. Distributor Registration:');
    const regResult = await registerDistributorWithRoleBasedFees(
        {
            id: 'dist-new',
            name: 'New Distributor',
            walletAddress: '0x123'
        },
        'admin456',
        'admin'
    );
    console.log('  Result:', regResult.success ? 'Success' : 'Failed');
    if (regResult.success) {
        console.log('  Transaction Fees:', regResult.transactionFees);
    }
    
    console.log('\n4. Batch Fee Calculation:');
    const batchResult = calculateBatchFees([
        { type: 'valve_transfer', amount: 0.1 },
        { type: 'po_approval', amount: 0.05 },
        { type: 'distributor_registration', amount: 0.02 }
    ], 'plant');
    console.log('  Summary:', batchResult.summary);
    
    console.log('\n5. Fee Tier Information:');
    const tiers = transactionFeeService.getAllFeeTiers();
    tiers.tiers.forEach(tier => {
        console.log(`  ${tier.role}: ${tier.basisPoints} bps (${tier.percentage}) - ${tier.description}`);
    });
}

// Export the example functions for potential use in actual application
module.exports = {
    approvePurchaseOrderWithFees,
    registerDistributorWithRoleBasedFees,
    transferValveWithFees,
    calculateBatchFees,
    runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
    runExamples().catch(console.error);
}