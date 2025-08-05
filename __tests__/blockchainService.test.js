const blockchainService = require('../blockchainService');
const transactionFeeService = require('../transactionFeeService');

describe('BlockchainService with Transaction Fees', () => {
    
    beforeEach(() => {
        // Ensure blockchain service is in mock mode for testing
        blockchainService.mockMode = true;
    });

    describe('calculateTransactionFee', () => {
        test('should calculate fees using transaction fee service', () => {
            const result = blockchainService.calculateTransactionFee('distributor', 1.0);
            
            expect(result.success).toBe(true);
            expect(result.role).toBe('distributor');
            expect(result.feeBasisPoints).toBe(10);
            expect(result.feeAmount).toBe(0.001);
        });

        test('should handle invalid inputs', () => {
            const result = blockchainService.calculateTransactionFee('', -1);
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('executeTransactionWithFees', () => {
        test('should execute transaction with fee calculation for distributor', async () => {
            const mockTransaction = jest.fn().mockResolvedValue({
                success: true,
                transactionHash: '0x123',
                blockNumber: 12345
            });

            const result = await blockchainService.executeTransactionWithFees(
                'distributor',
                1.0,
                mockTransaction,
                'test-arg'
            );

            expect(result.success).toBe(true);
            expect(result.feeDetails).toBeDefined();
            expect(result.feeDetails.userRole).toBe('distributor');
            expect(result.feeDetails.feeAmount).toBe(0.001);
            expect(result.feeDetails.netAmount).toBe(0.999);
            expect(result.feeDetails.feeBasisPoints).toBe(10);
            expect(mockTransaction).toHaveBeenCalledWith('test-arg');
        });

        test('should handle fee calculation errors', async () => {
            const mockTransaction = jest.fn().mockResolvedValue({
                success: true,
                transactionHash: '0x123'
            });

            const result = await blockchainService.executeTransactionWithFees(
                '',
                -1,
                mockTransaction
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Fee calculation failed');
            expect(mockTransaction).not.toHaveBeenCalled();
        });

        test('should handle transaction execution errors', async () => {
            const mockTransaction = jest.fn().mockRejectedValue(new Error('Transaction failed'));

            const result = await blockchainService.executeTransactionWithFees(
                'distributor',
                1.0,
                mockTransaction
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Transaction failed');
        });

        test('should calculate correct fees for different roles', async () => {
            const mockTransaction = jest.fn().mockResolvedValue({
                success: true,
                transactionHash: '0x123'
            });

            // Test plant role (40 bps)
            const plantResult = await blockchainService.executeTransactionWithFees(
                'plant',
                10.0,
                mockTransaction
            );

            expect(plantResult.success).toBe(true);
            expect(plantResult.feeDetails.feeAmount).toBe(0.04); // 10.0 * 0.004
            expect(plantResult.feeDetails.feeBasisPoints).toBe(40);

            // Test repair vendor role (10 bps)
            const repairResult = await blockchainService.executeTransactionWithFees(
                'repair_vendor',
                5.0,
                mockTransaction
            );

            expect(repairResult.success).toBe(true);
            expect(repairResult.feeDetails.feeAmount).toBe(0.005); // 5.0 * 0.001
            expect(repairResult.feeDetails.feeBasisPoints).toBe(10);
        });
    });

    describe('registerDistributorWithFees', () => {
        test('should register distributor with fee calculation', async () => {
            const distributorData = {
                id: 'dist-001',
                name: 'Test Distributor',
                walletAddress: '0x123'
            };

            const result = await blockchainService.registerDistributorWithFees(
                distributorData,
                'admin'
            );

            expect(result.success).toBe(true);
            expect(result.feeDetails).toBeDefined();
            expect(result.feeDetails.userRole).toBe('admin');
            expect(result.feeDetails.feeAmount).toBe(0); // Admin pays no fees
            expect(result.transactionHash).toBeDefined();
        });

        test('should handle distributor registration with distributor role fees', async () => {
            const distributorData = {
                id: 'dist-002',
                name: 'Another Distributor',
                walletAddress: '0x456'
            };

            const result = await blockchainService.registerDistributorWithFees(
                distributorData,
                'distributor',
                0.1 // 0.1 ETH transaction value
            );

            expect(result.success).toBe(true);
            expect(result.feeDetails.userRole).toBe('distributor');
            expect(result.feeDetails.feeAmount).toBe(0.0001); // 0.1 * 0.001
            expect(result.feeDetails.feeBasisPoints).toBe(10);
        });
    });

    describe('assignDistributorRightsWithFees', () => {
        test('should assign rights with appropriate fees', async () => {
            const result = await blockchainService.assignDistributorRightsWithFees(
                'mfg-001',
                'dist-001',
                'territory-001',
                ['read', 'write'],
                'plant',
                0.05
            );

            expect(result.success).toBe(true);
            expect(result.feeDetails.userRole).toBe('plant');
            expect(result.feeDetails.feeAmount).toBe(0.0002); // 0.05 * 0.004
            expect(result.feeDetails.feeBasisPoints).toBe(40);
        });
    });

    describe('revokeDistributorRightsWithFees', () => {
        test('should revoke rights with fee calculation', async () => {
            const result = await blockchainService.revokeDistributorRightsWithFees(
                'mfg-001',
                'dist-001',
                'territory-001',
                'repair_vendor',
                0.02
            );

            expect(result.success).toBe(true);
            expect(result.feeDetails.userRole).toBe('repair_vendor');
            expect(result.feeDetails.feeAmount).toBe(0.00002); // 0.02 * 0.001
            expect(result.feeDetails.feeBasisPoints).toBe(10);
        });
    });

    describe('transferValveOwnershipWithFees', () => {
        test('should transfer ownership with fees', async () => {
            const result = await blockchainService.transferValveOwnershipWithFees(
                'valve-123',
                'owner-1',
                'owner-2',
                'distributor',
                'user', // General user role
                1.5
            );

            expect(result.success).toBe(true);
            expect(result.feeDetails.userRole).toBe('user');
            expect(result.feeDetails.feeAmount).toBeCloseTo(0.009, 10); // 1.5 * 0.006 (60 bps)
            expect(result.feeDetails.feeBasisPoints).toBe(60);
        });
    });

    describe('getTransactionFeeEstimate', () => {
        test('should provide fee estimates for different roles', async () => {
            const distributorEstimate = await blockchainService.getTransactionFeeEstimate(
                'distributor',
                'register',
                2.0
            );

            expect(distributorEstimate.success).toBe(true);
            expect(distributorEstimate.userRole).toBe('distributor');
            expect(distributorEstimate.feeDetails.feeBasisPoints).toBe(10);
            expect(distributorEstimate.feeDetails.feeAmount).toBe(0.002);
            expect(distributorEstimate.feeDetails.feePercentage).toBe('0.10%');
        });

        test('should provide fee estimates for plant role', async () => {
            const plantEstimate = await blockchainService.getTransactionFeeEstimate(
                'plant',
                'ownership_transfer',
                5.0
            );

            expect(plantEstimate.success).toBe(true);
            expect(plantEstimate.userRole).toBe('plant');
            expect(plantEstimate.feeDetails.feeBasisPoints).toBe(40);
            expect(plantEstimate.feeDetails.feeAmount).toBe(0.02);
            expect(plantEstimate.feeDetails.feePercentage).toBe('0.40%');
        });

        test('should provide estimates for general transactions', async () => {
            const generalEstimate = await blockchainService.getTransactionFeeEstimate(
                'customer',
                'purchase',
                10.0
            );

            expect(generalEstimate.success).toBe(true);
            expect(generalEstimate.feeDetails.feeBasisPoints).toBe(60); // Default rate
            expect(generalEstimate.feeDetails.feeAmount).toBe(0.06);
            expect(generalEstimate.feeDetails.feePercentage).toBe('0.60%');
        });

        test('should handle invalid inputs for estimates', async () => {
            const invalidEstimate = await blockchainService.getTransactionFeeEstimate(
                '',
                'test',
                -1
            );

            expect(invalidEstimate.success).toBe(false);
            expect(invalidEstimate.error).toBeDefined();
        });
    });

    describe('Integration with existing methods', () => {
        test('should maintain backward compatibility with existing methods', async () => {
            // Test that original methods still work
            const distributorData = {
                id: 'dist-legacy',
                name: 'Legacy Distributor',
                walletAddress: '0x789'
            };

            const result = await blockchainService.registerDistributor(distributorData);

            expect(result.success).toBe(true);
            expect(result.transactionHash).toBeDefined();
            // Should not have fee details since it's the original method
            expect(result.feeDetails).toBeUndefined();
        });

        test('should work with all existing blockchain operations', async () => {
            // Test all original methods still function
            const distributor = await blockchainService.registerDistributor({
                id: 'test', name: 'Test', walletAddress: '0x123'
            });
            expect(distributor.success).toBe(true);

            const rights = await blockchainService.assignDistributorRights(
                'mfg', 'dist', 'territory', ['read']
            );
            expect(rights.success).toBe(true);

            const revoke = await blockchainService.revokeDistributorRights(
                'mfg', 'dist', 'territory'
            );
            expect(revoke.success).toBe(true);

            const transfer = await blockchainService.transferValveOwnership(
                'valve', 'from', 'to', 'type'
            );
            expect(transfer.success).toBe(true);
        });
    });

    describe('Error handling and edge cases', () => {
        test('should handle very small transaction amounts', async () => {
            const mockTransaction = jest.fn().mockResolvedValue({
                success: true,
                transactionHash: '0x123'
            });

            const result = await blockchainService.executeTransactionWithFees(
                'distributor',
                0.0001, // Very small amount
                mockTransaction
            );

            expect(result.success).toBe(true);
            expect(result.feeDetails.feeAmount).toBeCloseTo(0.0000001, 10);
        });

        test('should handle zero transaction amounts', async () => {
            const mockTransaction = jest.fn().mockResolvedValue({
                success: true,
                transactionHash: '0x123'
            });

            const result = await blockchainService.executeTransactionWithFees(
                'distributor',
                0,
                mockTransaction
            );

            expect(result.success).toBe(true);
            expect(result.feeDetails.feeAmount).toBe(0);
        });

        test('should handle large transaction amounts', async () => {
            const mockTransaction = jest.fn().mockResolvedValue({
                success: true,
                transactionHash: '0x123'
            });

            const result = await blockchainService.executeTransactionWithFees(
                'plant',
                1000.0,
                mockTransaction
            );

            expect(result.success).toBe(true);
            expect(result.feeDetails.feeAmount).toBe(4.0); // 1000 * 0.004
            expect(result.feeDetails.netAmount).toBe(996.0);
        });
    });
});